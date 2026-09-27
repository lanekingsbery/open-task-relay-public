import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {rehearseOperatorBackup} from '../scripts/rehearse-operator-d1.mjs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {operatorMigrationPlan,OPERATOR_TABLES,OPERATOR_MIGRATION} from '../scripts/relay-operator-migration-plan.mjs';
import {APPLICATION_SCHEMA_SQL} from '../scripts/relay-migration-plan.mjs';

test('operator additive release transaction: exact baseline, injected late rollback, history, replay and integrity',async t=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',compatibilityDate:'2026-09-07',d1Databases:['DB'],outboundService:()=>{throw Error('No network')}}));t.after(()=>mf.dispose());
 const db=await mf.getD1Database('DB'),expectedLedger=JSON.parse(readFileSync('drizzle/meta/_journal.json')).entries.map(x=>x.tag+'.sql');
 await db.prepare('CREATE TABLE __appgarden_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)').run();
 for(const name of expectedLedger.slice(0,-1)){
  for(const s of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(s).run();
  await db.prepare('INSERT INTO __appgarden_migrations(name) VALUES (?)').bind(name).run();
 }
 const schema=(await db.prepare(APPLICATION_SCHEMA_SQL).all()).results,ledger=expectedLedger.slice(0,-1),sql=readFileSync('drizzle/'+OPERATOR_MIGRATION,'utf8');
 // Realistic preexisting immutable denial, observation/run and canonical task state.
 await db.prepare("INSERT INTO relay_actions(id,action_key,actor,policy_id,policy_version,target,proposal_hash,evidence_refs,rationale_summary,started_at,finished_at,outcome,error_code) VALUES ('old','old','relay','deny','v1','[]','hash','[]','old',1,1,'denied','DISABLED')").run();
 const tables=schema.filter(x=>x.type==='table').map(x=>x.name),before={};for(const table of tables)before[table]=(await db.prepare('SELECT * FROM '+table).all()).results;
 const plan=operatorMigrationPlan({schema,ledger,sql,expectedLedger});
 await assert.rejects(db.batch([...plan,"SELECT json('INJECTED_LATE_FAILURE')"].map(s=>db.prepare(s))));
 assert.deepEqual((await db.prepare(APPLICATION_SCHEMA_SQL).all()).results,schema);
 for(const table of tables)assert.deepEqual((await db.prepare('SELECT * FROM '+table).all()).results,before[table]);
 await db.batch(plan.map(s=>db.prepare(s)));
 for(const table of tables.filter(x=>x!=='__appgarden_migrations'))assert.deepEqual((await db.prepare('SELECT * FROM '+table).all()).results,before[table]);
 for(const object of schema)assert.deepEqual(await db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name=?').bind(object.name).first(),object);
 for(const table of OPERATOR_TABLES)assert.equal((await db.prepare('SELECT count(*) n FROM '+table).first()).n,table==='relay_operator_control'?1:0);
 assert.deepEqual((await db.prepare('SELECT name FROM __appgarden_migrations ORDER BY id').all()).results.map(x=>x.name),expectedLedger);
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);assert.equal((await db.prepare('PRAGMA quick_check').first()).quick_check,'ok');
 await assert.rejects(db.batch(plan.map(s=>db.prepare(s))));
 await assert.rejects(db.prepare("UPDATE relay_actions SET error_code='changed'").run(),/append only/);
});

// Synthetic rows only. Match the observed Cloudflare export ordering: each table's
// CREATE/INSERT precedes later tables, including referenced observation/run tables.
function cloudflareOrderedBackup(t,{orphan=false}={}){
 const sqlite=new DatabaseSync(':memory:');
 t.after(()=>sqlite.close());
 sqlite.exec('CREATE TABLE __appgarden_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)');
 const ledger=JSON.parse(readFileSync('drizzle/meta/_journal.json')).entries.map(x=>x.tag+'.sql').slice(0,-1);
 for(const name of ledger){sqlite.exec(readFileSync('drizzle/'+name,'utf8'));sqlite.prepare('INSERT INTO __appgarden_migrations(name) VALUES (?)').run(name)}
 sqlite.exec("INSERT INTO relay_runs(run_id,trigger,started_at,status,policy_version,source_version,lease_generation) VALUES ('run','scheduled',1,'finished','v1','fixture',1)");
 sqlite.exec("INSERT INTO relay_observations(id,run_id,check_id,observed_at,fingerprint,severity,state_json_redacted,source_refs,expires_at) VALUES ('observation','run','health',1,'fingerprint','info','{}','[]',2)");
 sqlite.exec("INSERT INTO relay_check_state(check_id,last_attempt_at,observation_id) VALUES ('health',1,'observation')");
 const schema=sqlite.prepare(APPLICATION_SCHEMA_SQL).all(),statements=['PRAGMA defer_foreign_keys=TRUE;'];
 const literal=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+value.replaceAll("'","''")+"'";
 for(const table of schema.filter(x=>x.type==='table')){
  statements.push(table.sql+';');
  for(const row of sqlite.prepare('SELECT * FROM "'+table.name+'"').all()){
   if(orphan&&table.name==='relay_check_state')row.observation_id='missing';
   statements.push('INSERT INTO "'+table.name+'" VALUES ('+Object.values(row).map(literal).join(',')+');');
  }
 }
 statements.push(...schema.filter(x=>x.type!=='table').map(x=>x.sql+';'));
 const bytes=Buffer.from(statements.join('\n'));
 const directory=mkdtempSync(join(tmpdir(),'operator-export-order-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const path=join(directory,'backup.sql');writeFileSync(path,bytes,{mode:0o600});
 return {bytes,path,hash:createHash('sha256').update(bytes).digest('hex')};
}

test('Cloudflare table-before-parent export restores and passes exact 0013 D1 preservation, rollback and replay',async t=>{
 const {bytes,path,hash}=cloudflareOrderedBackup(t);
 const oldRestore=new DatabaseSync(':memory:');t.after(()=>oldRestore.close());
 assert.throws(()=>oldRestore.exec(bytes.toString('utf8')),/no such table: main.relay_observations/);
 const receipt=await rehearseOperatorBackup(path,hash);
 assert.equal(receipt.reference_integrity,'ok');assert.equal(receipt.foreign_key_enforcement,true);
 assert.equal(receipt.baseline_tables,31);assert.equal(receipt.migrated_tables,35);
 assert.equal(receipt.old_rows_preserved,17); // 13 ledger rows, one migration seed, three linked fixture rows.
 assert.equal(receipt.all_old_hashes_preserved,true);
 assert.equal(receipt.exact_schema,'MATCHED');assert.equal(receipt.ledger_before,13);assert.equal(receipt.ledger_after,14);
 assert.equal(receipt.rollback,'passed');assert.equal(receipt.replay_refused,true);
 assert.equal(receipt.foreign_keys,'passed');assert.equal(receipt.quick_check,'ok');assert.equal(receipt.outbound_requests,0);
});

test('Cloudflare ordered import rejects orphan rows after restoring foreign-key enforcement',async t=>{
 const {path,hash}=cloudflareOrderedBackup(t,{orphan:true});
 await assert.rejects(rehearseOperatorBackup(path,hash),{code:'ERR_ASSERTION'});
});
