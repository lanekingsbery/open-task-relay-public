import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const secret='PRIVATE_SHADOW_SENTINEL_DO_NOT_COPY';
const migrations=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
export async function shadowFixture(t,engine='sqlite') {
  let db,all;
  if(engine==='d1') {
    const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("fixture")}}',
      compatibilityDate:'2026-09-07',d1Databases:['DB'],outboundService:()=>{assert.fail('OUTBOUND_FORBIDDEN')}}));
    t.after(()=>mf.dispose());const raw=await mf.getD1Database('DB');
    db={prepare:query=>raw.prepare(query),batch:statements=>raw.batch(statements)};
    all=async q=>(await raw.prepare(q).all()).results;
  } else {
    const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec('PRAGMA foreign_keys=ON');
    db={prepare(query){let args=[];return {bind(...values){args=values;return this},
      async first(){return sql.prepare(query).get(...args)??null},async run(){return sql.prepare(query).run(...args)},
      sync(){return sql.prepare(query).run(...args)}}},
      async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(s=>s.sync());sql.exec('COMMIT');return rows}catch(e){sql.exec('ROLLBACK');throw e}}};
    all=async q=>sql.prepare(q).all();
  }
  for(const f of migrations)for(const statement of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(statement).run();
  const agent=crypto.randomUUID(),id=crypto.randomUUID(),created='2025-01-01T00:00:00.000Z';
  await db.prepare(`INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen,managed)
    VALUES (?,?,'fixture',?,'[]','[]',?,?,1)`).bind(agent,created,secret,secret,created).run();
  await db.prepare(`INSERT INTO tasks(id,created_at,creator,title,description,required_capabilities,updated_at,protocol,moderation_status)
    VALUES (?,?,?, ?,?,'[]',?,?,'approved')`).bind(id,created,agent,secret,secret,created,JSON.stringify({revision:1,objective:secret})).run();
  const count=async table=>(await db.prepare('SELECT count(*) n FROM '+table).first()).n;
  const tables=(await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'relay_%' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name!='mutation_guards'" )).map(r=>r.name);
  const snapshot=async()=>JSON.stringify(await Promise.all(tables.map(table=>all('SELECT * FROM '+table+' ORDER BY rowid'))));
  return {db,all,id,agent,count,snapshot};
}
