import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {oaiFixture} from './oai-fixture.mjs';
import {validateOaiXml} from './oai-xml.mjs';

test('built Worker and D1 upgrade publish synthetic reports with no workflow writes or egress',async()=>{
 const outbound=[];
 const mf=new Miniflare(convertV4MiniflareOptions({
  modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),
  modulesRoot:'dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],
  bindings:{OAI_ADMIN_EMAIL:'repository@example.org',RELAY_SELF_HOSTED:'true',RELAY_ENABLED:'true',RELAY_CHAT_ENABLED:'true'},
  serviceBindings:{ASSETS:async()=>new Response(null,{status:404})},
  outboundService:async request=>{outbound.push(request.url);throw new Error('Harvest must not perform egress/inference')},
 }));
 try{
  const db=await mf.getD1Database('DB');
  const apply=async name=>{for(const statement of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(statement).run()};
  for(const name of readdirSync('drizzle').filter(f=>f.endsWith('.sql')&&f<'0016_oai_harvest.sql').sort())await apply(name);
  const f=await oaiFixture(db);
  const dump=async()=>{
   const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'oai_%' AND name NOT LIKE '_cf_%' ORDER BY name").all()).results;
   return JSON.stringify(await Promise.all(tables.map(async t=>(await db.prepare('SELECT * FROM '+t.name).all()).results)));
  };
  const before=await dump();await apply('0016_oai_harvest.sql');assert.equal(await dump(),before,'Upgrade preserves workflow state');
  assert.equal((await db.prepare('SELECT count(*) n FROM oai_items').first()).n,1,'Upgrade backfills only eligible accepted records');
  const identify=await mf.dispatchFetch('https://opentaskrelay.org/oai?verb=Identify');assert.equal(identify.status,200);validateOaiXml(await identify.text());
  // Guard every existing application table: successful GET and OAI POST must
  // still work when any workflow write is rejected at the database boundary.
  const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all()).results;
  for(const {name} of tables)for(const verb of ['INSERT','UPDATE','DELETE'])await db.prepare(`CREATE TRIGGER harvest_guard_${name}_${verb} BEFORE ${verb} ON ${name} BEGIN SELECT RAISE(ABORT,'Harvest workflow write rejected'); END`).run();
  for(const query of ['verb=Identify','verb=ListMetadataFormats','verb=ListSets','verb=ListIdentifiers&metadataPrefix=oai_dc','verb=ListRecords&metadataPrefix=oai_openaire',`verb=GetRecord&identifier=oai:opentaskrelay.org:bundle:${f.taskId}&metadataPrefix=oai_dc`])for(const method of ['GET','POST']){
   const response=await mf.dispatchFetch('https://opentaskrelay.org/oai'+(method==='GET'?'?'+query:''),{method,...(method==='POST'?{body:query,headers:{'Content-Type':'application/x-www-form-urlencoded'}}:{})});
   const body=await response.text();assert.equal(response.status,200,body);validateOaiXml(body);assert.doesNotMatch(body,/PRIVATE_|token_hash|owner_id/);
  }
  const fulltext=await mf.dispatchFetch('https://opentaskrelay.org/oai/reports/'+f.taskId);assert.equal(fulltext.status,200);assert.match(await fulltext.text(),/Synthetic findings/);
  assert.equal(await dump(),before);assert.deepEqual(outbound,[]);
  for(const {name} of tables)for(const verb of ['INSERT','UPDATE','DELETE'])await db.prepare(`DROP TRIGGER harvest_guard_${name}_${verb}`).run();
  // Atomic rollback also rolls back harvest projection changes.
  await assert.rejects(db.batch([db.prepare("UPDATE tasks SET title='Should roll back' WHERE id=?").bind(f.taskId),db.prepare("INSERT INTO mutation_guards(id,ok) VALUES('oai-rollback',0)")]));
  assert.doesNotMatch((await db.prepare('SELECT metadata FROM oai_items').first()).metadata,/Should roll back/);
  await db.prepare("UPDATE tasks SET status='disputed' WHERE id=?").bind(f.taskId).run();
  const withdrawal=await mf.dispatchFetch('https://opentaskrelay.org/oai?verb=ListRecords&metadataPrefix=oai_openaire&set=otr_accepted');
  const body=await withdrawal.text();validateOaiXml(body);assert.match(body,/status="deleted"/);assert.doesNotMatch(body,/<metadata>|Synthetic findings/);
  assert.equal((await mf.dispatchFetch('https://opentaskrelay.org/oai/reports/'+f.taskId)).status,404);
  assert.deepEqual(outbound,[]);
 }finally{await mf.dispose()}
});
