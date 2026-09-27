/** Local-only restore and D1 rehearsal. Never reads credentials or contacts production. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {operatorMigrationPlan,OPERATOR_MIGRATION,OPERATOR_TABLES} from './relay-operator-migration-plan.mjs';
import {APPLICATION_SCHEMA_SQL,serializeD1Batch} from './relay-migration-plan.mjs';
import {rowHash} from './rehearse-relay-d1.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
export async function rehearseOperatorBackup(path,expectedHash,planPath){
 assert.equal(statSync(path).mode&0o777,0o600);const bytes=readFileSync(path);assert.equal(sha(bytes),expectedHash);
 // Cloudflare exports each table followed by its rows, before referenced tables may exist.
 // Disable enforcement only for this local reference import; D1 keeps enforcement enabled.
 const sqlite=new DatabaseSync(':memory:',{enableForeignKeyConstraints:false});
 let schema,rows,expectedSchema;
 const migration=readFileSync(root+'drizzle/'+OPERATOR_MIGRATION,'utf8');
 try{
  sqlite.exec(bytes.toString('utf8'));
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA defer_foreign_keys=OFF');
  assert.equal(sqlite.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.equal(sqlite.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  schema=sqlite.prepare(APPLICATION_SCHEMA_SQL).all().map(x=>({...x}));
  rows=Object.fromEntries(schema.filter(x=>x.type==='table').map(x=>[x.name,sqlite.prepare('SELECT * FROM "'+x.name+'"').all().map(x=>({...x}))]));
  sqlite.exec(migration);expectedSchema=sqlite.prepare(APPLICATION_SCHEMA_SQL).all().map(x=>({...x}));
 }finally{sqlite.close()}
 const ledger=rows.__appgarden_migrations.sort((a,b)=>a.id-b.id).map(x=>x.name);
 const expectedLedger=JSON.parse(readFileSync(root+'drizzle/meta/_journal.json')).entries.map(x=>x.tag+'.sql').filter(x=>x<=OPERATOR_MIGRATION);
 const plan=operatorMigrationPlan({schema,ledger,sql:migration,expectedLedger});
 const outbound=[];const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("local restore")}}',compatibilityDate:'2026-09-07',d1Databases:['DB'],outboundService:r=>{outbound.push(r.url);throw Error('Network forbidden')}}));
 try{
  const db=await mf.getD1Database('DB');
  const restore=[db.prepare('PRAGMA defer_foreign_keys=ON'),...schema.filter(x=>x.type==='table').map(x=>db.prepare(x.sql))];
  for(const [table,values] of Object.entries(rows))for(const row of values){const names=Object.keys(row);restore.push(db.prepare('INSERT INTO "'+table+'" ('+names.map(x=>'"'+x+'"').join(',')+') VALUES ('+names.map(()=>'?').join(',')+')').bind(...Object.values(row)))}
  restore.push(...schema.filter(x=>x.type!=='table').map(x=>db.prepare(x.sql)));await db.batch(restore);
  const snapshot=async()=>({schema:(await db.prepare(APPLICATION_SCHEMA_SQL).all()).results,hashes:Object.fromEntries(await Promise.all(Object.keys(rows).map(async table=>[table,rowHash((await db.prepare('SELECT * FROM "'+table+'"').all()).results)])))});
  assert.equal((await db.prepare('PRAGMA foreign_keys').first()).foreign_keys,1);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  assert.equal((await db.prepare('PRAGMA quick_check').first()).quick_check,'ok');
  const before=await snapshot();assert.deepEqual(before.schema,schema);
  for(const table of Object.keys(rows))assert.equal(before.hashes[table],rowHash(rows[table]));
  const run=queries=>db.batch(queries.map(s=>db.prepare(s)));
  await assert.rejects(run([...plan,"SELECT json('OPERATOR_LATE_FAILURE')"]));assert.deepEqual(await snapshot(),before);
  const committed=await run(plan);
  for(const table of Object.keys(rows).filter(x=>x!=='__appgarden_migrations')){
   const query='SELECT * FROM \"'+table+'\"';
   assert.equal(rowHash(committed[plan.indexOf(query)].results),rowHash(committed[plan.lastIndexOf(query)].results));
  }
  assert.deepEqual((await snapshot()).schema,expectedSchema);
  const after=await snapshot();for(const table of Object.keys(rows).filter(x=>x!=='__appgarden_migrations'))assert.equal(after.hashes[table],before.hashes[table]);
  const ledgerAfter=(await db.prepare('SELECT * FROM __appgarden_migrations ORDER BY id').all()).results;
  assert.deepEqual(ledgerAfter.map(x=>x.name),expectedLedger);assert.equal(rowHash(ledgerAfter.slice(0,-1)),before.hashes.__appgarden_migrations);
  for(const table of OPERATOR_TABLES)assert.equal((await db.prepare('SELECT count(*) n FROM '+table).first()).n,table==='relay_operator_control'?1:0);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);assert.equal((await db.prepare('PRAGMA quick_check').first()).quick_check,'ok');
  await assert.rejects(run(plan));assert.deepEqual(await snapshot(),after);assert.deepEqual(outbound,[]);
  assert.equal(sha(readFileSync(path)),expectedHash,'Backup changed during rehearsal');
  if(planPath)writeFileSync(planPath,JSON.stringify({schema,ledger,expectedSchema,queries:plan,table_hashes:before.hashes},null,2),{mode:0o600,flag:'wx'});
  return {backup_sha256:expectedHash,migration_sha256:sha(migration),sql_payload_sha256:sha(serializeD1Batch(plan)),
   baseline_tables:schema.filter(x=>x.type==='table').length,migrated_tables:expectedSchema.filter(x=>x.type==='table').length,
   old_rows_preserved:Object.values(rows).reduce((n,r)=>n+r.length,0),all_old_hashes_preserved:true,exact_schema:'MATCHED',ledger_before:13,ledger_after:14,
   reference_integrity:'ok',foreign_key_enforcement:true,rollback:'passed',replay_refused:true,foreign_keys:'passed',quick_check:'ok',outbound_requests:0};
 }finally{await mf.dispose()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [path,hash,planPath]=process.argv.slice(2);console.log(JSON.stringify(await rehearseOperatorBackup(path,hash,planPath),null,2))}
 catch{console.error('STOP: operator backup rehearsal failed. Private data and exception details withheld.');process.exitCode=1}
}
