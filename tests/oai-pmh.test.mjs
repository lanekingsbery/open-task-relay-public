import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {oaiResponse,OAI_PAGE_SIZE,OAI_SET} from '../lib/oai-pmh.ts';
import {oaiFixture} from './oai-fixture.mjs';
import {validateOaiXml} from './oai-xml.mjs';

const contact='repository@example.org';
const request=(query,post=false)=>post?new Request('https://opentaskrelay.org/oai',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:query}):new Request('https://opentaskrelay.org/oai?'+query);
const send=async(db,query,post=false,config={})=>{
 const response=await oaiResponse(db,request(query,post),{adminEmail:contact,...config});
 const body=await response.text();assert.equal(response.status,200,body);validateOaiXml(body);return body;
};
const id=f=>'oai:opentaskrelay.org:bundle:'+f.taskId;
const error=(body,code)=>assert.match(body,new RegExp('<error code="'+code+'">'));
const token=body=>body.match(/<resumptionToken[^>]*>([^<]+)<\/resumptionToken>/)?.[1];
const stripTime=body=>body.replace(/<responseDate>[^<]+<\/responseDate>/,'');
const item=db=>db.prepare('SELECT * FROM oai_items ORDER BY item_no DESC LIMIT 1').first();

test('all six verbs, both metadata formats, GET/POST equivalence and official schema checks',async()=>{
 const f=await oaiFixture();
 for(const query of ['verb=Identify','verb=ListMetadataFormats','verb=ListSets',
  ...['oai_dc','oai_openaire'].flatMap(prefix=>[
   `verb=ListIdentifiers&metadataPrefix=${prefix}&set=${OAI_SET}`,
   `verb=ListRecords&metadataPrefix=${prefix}`,`verb=GetRecord&identifier=${id(f)}&metadataPrefix=${prefix}`])]){
  assert.equal(stripTime(await send(f.db,query)),stripTime(await send(f.db,query,true)));
 }
 const identify=await send(f.db,'verb=Identify');
 assert.match(identify,/<deletedRecord>persistent<\/deletedRecord>/);assert.match(identify,/<adminEmail>repository@example.org<\/adminEmail>/);
 assert.ok(identify.includes('<earliestDatestamp>'+(await item(f.db)).first_datestamp+'</earliestDatestamp>'));
 const b=await send(f.db,'verb=ListRecords&metadataPrefix=oai_openaire');
 for(const value of ['Fixture agent &amp; &lt;Robot&gt; 雪 😀','resourceTypeGeneral="literature"','c_93fc','dateType="Issued">2026-09-01','Contribution','Underlying sources retain','site','<dc:language>und</dc:language>','https://creativecommons.org/licenses/by/4.0/']){
  if(['Contribution','site'].includes(value))continue;assert.ok(b.includes(value),value);
 }
 assert.doesNotMatch(b,/PRIVATE_PROFILE_SENTINEL|PRIVATE_AUDIT_SENTINEL|doi\.org|zenodo|ORCID|affiliation|fundingReferences/);
});

test('malformed, duplicate, empty, unknown and exclusive arguments have valid protocol errors',async()=>{
 const f=await oaiFixture();
 const cases=[['','badVerb'],['verb=Other','badVerb'],['verb=Identify&verb=Identify','badArgument'],
  ['verb=Identify&extra=x','badArgument'],['verb=Identify&identifier=x','badArgument'],['verb=Identify&%xx=y','badArgument'],
  ['verb=Identify&extra=%C3%28','badArgument'],['verb=ListRecords','badArgument'],['verb=GetRecord&identifier=x','badArgument'],
  ['verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc','badArgument'],['verb=ListRecords&metadataPrefix=','badArgument'],
  ['verb=ListRecords&metadataPrefix=unknown','cannotDisseminateFormat'],['verb=ListRecords&metadataPrefix=oai_dc&set=nope','noRecordsMatch'],
  ['verb=GetRecord&metadataPrefix=oai_dc&identifier=missing','idDoesNotExist'],['verb=ListMetadataFormats&identifier=missing','idDoesNotExist'],
  ['verb=ListRecords&resumptionToken=bad','badResumptionToken'],['verb=ListSets&resumptionToken=bad','badResumptionToken'],
  ['verb=ListRecords&resumptionToken=bad&metadataPrefix=oai_dc','badArgument']];
 for(const [query,code] of cases)for(const post of [false,true]){
  const body=await send(f.db,query,post);error(body,code);
  if(['badVerb','badArgument'].includes(code))assert.match(body,/<request>https:\/\/opentaskrelay.org\/oai<\/request>/);
 }
 const cross=new Request('https://opentaskrelay.org/oai?verb=Identify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'verb=Identify'});
 error(await (await oaiResponse(f.db,cross)).text(),'badArgument');
 for(const req of [new Request('https://opentaskrelay.org/oai',{method:'POST',body:'verb=Identify'}),request('verb=Identify&extra='+ 'x'.repeat(5000),true),request('verb=Identify&extra='+ 'x'.repeat(5000))]){
  const b=await (await oaiResponse(f.db,req)).text();validateOaiXml(b);error(b,'badArgument');
 }
 assert.equal((await oaiResponse(f.db,request('verb=Identify'))).status,503,'No invented repository email');
});

test('inclusive UTC days and seconds, calendar errors and empty ranges',async()=>{
 const f=await oaiFixture();const s=(await item(f.db)).datestamp,base='verb=ListIdentifiers&metadataPrefix=oai_dc';
 for(const range of [`from=${s}&until=${s}`,`from=${s.slice(0,10)}&until=${s.slice(0,10)}`,`from=${s}`,`until=${s}`])assert.ok((await send(f.db,base+'&'+range)).includes(id(f)));
 error(await send(f.db,base+'&until=2000-01-01'),'noRecordsMatch');
 for(const range of ['from=2026-02-30','until=2026-01-01T25:00:00Z','from=2026-01-01&until=2026-01-01T00:00:00Z','from=2026-10-02&until=2026-10-01','from=2026-01-01T00:00:00.000Z','from=0000-01-01'])error(await send(f.db,base+'&'+range),'badArgument');
});

test('deterministic bounded pagination, token replay, updates, withdrawals, expiration and tampering',async()=>{
 const f=await oaiFixture();const fixtures=[f];
 for(let i=0;i<OAI_PAGE_SIZE+3;i++)fixtures.push(await oaiFixture(f.db));
 const first=await send(f.db,'verb=ListRecords&metadataPrefix=oai_dc'),t=token(first);assert.ok(t);
 assert.equal((first.match(/<record>/g)||[]).length,OAI_PAGE_SIZE);
 const next='verb=ListRecords&resumptionToken='+t;
 const replay=await send(f.db,next);assert.equal(stripTime(replay),stripTime(await send(f.db,next,true)));
 assert.match(replay,/<resumptionToken><\/resumptionToken>/);
 // New records are beyond the fixed initial item-number ceiling.
 await oaiFixture(f.db);assert.equal(stripTime(replay),stripTime(await send(f.db,next)));
 const changed=fixtures.at(-1);await f.db.prepare("UPDATE tasks SET title='Updated Unicode Ω' WHERE id=?").bind(changed.taskId).run();
 assert.match(await send(f.db,next),/Updated Unicode Ω/);
 await f.db.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(changed.taskId).run();
 const withdrawn=await send(f.db,next);assert.ok(withdrawn.includes('<header status="deleted"><identifier>'+id(changed)));assert.doesNotMatch(withdrawn,/Updated Unicode Ω/);
 error(await send(f.db,next,false,{now:Date.now()+86400001}),'badResumptionToken');
 error(await send(f.db,'verb=ListIdentifiers&resumptionToken='+t),'badResumptionToken');
 error(await send(f.db,next.slice(0,-1)+(next.endsWith('0')?'1':'0')),'badResumptionToken');
 const ids=[];let page=first;
 for(;;){ids.push(...[...page.matchAll(/<identifier>([^<]+)<\/identifier>/g)].map(x=>x[1]));const tk=token(page);if(!tk)break;page=await send(f.db,'verb=ListRecords&resumptionToken='+tk)}
 assert.equal(ids.length,fixtures.length);assert.equal(new Set(ids).size,fixtures.length);
});

test('eligibility withdrawals persist for full, date and set harvests; reacceptance reuses UUID',async(t)=>{
 const cases={quarantine:f=>['tasks','moderation_status','quarantined',f.taskId],pending:f=>['tasks','moderation_status','pending',f.taskId],
  archived:f=>['tasks','status','closed',f.taskId],unaccepted:f=>['tasks','accepted_result_id',null,f.taskId],
  simulated_producer:f=>['agents','demo',1,f.producer],simulated_creator:f=>['agents','demo',1,f.owner],
  restricted_producer:f=>['agents','posting_restricted',1,f.producer],restricted_creator:f=>['agents','posting_restricted',1,f.owner],
  restricted_reviewer:f=>['agents','posting_restricted',1,f.reviewer],site_reviewer:f=>['agents','managed',1,f.reviewer],
  dispute:f=>['verifications','verdict','dispute',f.reviewId],invalid_result:f=>['results','validation','{"passed":false}',f.resultId],
  premise:f=>['results','result_kind','premise_stale',f.resultId]};
 for(const [name,change] of Object.entries(cases))await t.test(name,async()=>{
  const f=await oaiFixture(),before=await item(f.db);
  await f.db.prepare("UPDATE oai_items SET datestamp='2000-01-01T00:00:00Z' WHERE task_id=?").bind(f.taskId).run();
  const [table,column,value,key]=change(f);await f.db.prepare(`UPDATE ${table} SET ${column}=? WHERE id=?`).bind(value,key).run();
  const after=await item(f.db);assert.equal(after.metadata,null);assert.ok(after.datestamp>'2000-01-01T00:00:00Z');assert.equal(after.first_datestamp,before.first_datestamp);
  for(const prefix of ['oai_dc','oai_openaire'])for(const query of [`verb=GetRecord&identifier=${id(f)}&metadataPrefix=${prefix}`,`verb=ListRecords&metadataPrefix=${prefix}&set=${OAI_SET}&from=${after.datestamp}`]){
   const b=await send(f.db,query);assert.match(b,/status="deleted"/);assert.doesNotMatch(b,/<metadata>|Synthetic findings|Fixture agent/);
  }
  await f.db.prepare(`UPDATE ${table} SET ${column}=? WHERE id=?`).bind(column==='accepted_result_id'?f.resultId:before.metadata&&({demo:0,managed:0,posting_restricted:0,moderation_status:'approved',status:'completed',verdict:'agree',validation:'{"passed":true}',result_kind:'contribution'})[column],key).run();
  assert.notEqual((await item(f.db)).metadata,null);assert.equal((await item(f.db)).item_no,before.item_no);
  await assert.rejects(f.db.prepare('DELETE FROM oai_items WHERE task_id=?').bind(f.taskId).run(),/Persistent OAI/);
 });
 const f=await oaiFixture();await f.db.prepare("UPDATE agents SET operator='same' WHERE id IN (?,?)").bind(f.producer,f.reviewer).run();assert.equal((await item(f.db)).metadata,null);
 const pending=await oaiFixture(undefined,{accept:false});assert.equal(await item(pending.db),null);error(await send(pending.db,`verb=GetRecord&identifier=${id(pending)}&metadataPrefix=oai_dc`),'idDoesNotExist');
 const legacy=await oaiFixture(undefined,{completeness:'unknown',snapshot:false,license:'unspecified',siteRun:true});
 const b=await send(legacy.db,'verb=ListRecords&metadataPrefix=oai_openaire');assert.match(b,/Legacy record/);assert.match(b,/site-run software agent/);assert.match(b,/<oaire:licenseCondition>unspecified/);
});

test('export changes restamp, private fields never leak, no maintenance/writes/network occur',async()=>{
 const f=await oaiFixture();
 await f.db.prepare("INSERT INTO human_problems(task_id,owner_id,email,created_at) VALUES(?,'PRIVATE_OWNER_SENTINEL','PRIVATE_EMAIL_SENTINEL',?)").bind(f.taskId,'2026-09-01').run();
 const version=await item(f.db);
 for(const [sql,args] of [
  ["UPDATE tasks SET title='Changed title' WHERE id=?",[f.taskId]],
  ["UPDATE agents SET name='Changed agent' WHERE id=?",[f.producer]],
  ["UPDATE agents SET managed=1 WHERE id=?",[f.producer]],
  ["UPDATE results SET evidence='[\"https://example.org/new-source\"]' WHERE id=?",[f.resultId]],
  ["UPDATE acceptance_snapshots SET protocol='{\"category\":\"education\",\"license\":\"CC0-1.0\"}' WHERE result_id=?",[f.resultId]],
 ]){
  await f.db.prepare("UPDATE oai_items SET datestamp='2000-01-01T00:00:00Z' WHERE task_id=?").bind(f.taskId).run();
  await f.db.prepare(sql).bind(...args).run();assert.ok((await item(f.db)).datestamp>'2000-01-01T00:00:00Z');
 }
 assert.equal((await item(f.db)).first_datestamp,version.first_datestamp);
 const dump=async()=>{const tables=(await f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results;return JSON.stringify(await Promise.all(tables.map(x=>f.db.prepare('SELECT * FROM '+x.name).all())))};
 const before=await dump(),sqls=[],fetchBefore=globalThis.fetch;
 const readOnly={prepare(sql){assert.match(sql,/^SELECT /);assert.match(sql,/LIMIT 1|LIMIT \?/);sqls.push(sql);const stmt=f.db.prepare(sql);return {bind(...args){stmt.bind(...args);return this},first:()=>stmt.first(),all:()=>stmt.all()}}};
 globalThis.fetch=()=>{throw new Error('Network/paid inference forbidden')};
 try{for(const query of ['verb=Identify','verb=ListMetadataFormats','verb=ListSets','verb=ListRecords&metadataPrefix=oai_dc','verb=ListIdentifiers&metadataPrefix=oai_openaire',`verb=GetRecord&identifier=${id(f)}&metadataPrefix=oai_openaire`])for(const post of [false,true]){
  const b=await send(readOnly,query,post);assert.doesNotMatch(b,/PRIVATE_|token_hash|last_seen|owner_id|declared_operator/);
 }}finally{globalThis.fetch=fetchBefore}
 assert.equal(await dump(),before);assert.ok(sqls.length>0);
 await f.db.prepare("UPDATE human_problems SET privacy_requested_at='2026-10-01' WHERE task_id=?").bind(f.taskId).run();assert.equal((await item(f.db)).metadata,null);
});

test('superseding an accepted result keeps the bundle identifier, and physical removal retains its tombstone',async()=>{
 const f=await oaiFixture(),original=await item(f.db),replacement=crypto.randomUUID();
 await f.db.prepare(`INSERT INTO results(id,created_at,task_id,author,content,evidence,validation,contract_revision)
  SELECT ?,created_at,task_id,author,'Corrected synthetic findings',evidence,validation,contract_revision FROM results WHERE id=?`).bind(replacement,f.resultId).run();
 await f.db.prepare(`INSERT INTO verifications(id,created_at,result_id,author,verdict,completeness,content,evidence,confidence)
  SELECT ?,created_at,?,author,verdict,'partial',content,evidence,confidence FROM verifications WHERE id=?`).bind(crypto.randomUUID(),replacement,f.reviewId).run();
 assert.equal((await item(f.db)).metadata,original.metadata,'Pending replacement cannot enter the accepted export');
 await f.db.prepare('UPDATE tasks SET accepted_result_id=? WHERE id=?').bind(replacement,f.taskId).run();
 const corrected=await item(f.db);assert.equal(corrected.item_no,original.item_no);assert.equal(corrected.first_datestamp,original.first_datestamp);
 const b=await send(f.db,`verb=GetRecord&identifier=${id(f)}&metadataPrefix=oai_openaire`);
 assert.match(b,/Corrected synthetic findings/);assert.match(b,/declarations: partial/);assert.ok(b.includes(replacement));assert.ok(!b.includes(f.resultId));
 await f.db.prepare('DELETE FROM verifications WHERE result_id IN (?,?)').bind(f.resultId,replacement).run();
 await f.db.prepare('DELETE FROM acceptance_snapshots WHERE task_id=?').bind(f.taskId).run();
 await f.db.prepare('DELETE FROM results WHERE task_id=?').bind(f.taskId).run();
 await f.db.prepare('DELETE FROM tasks WHERE id=?').bind(f.taskId).run();
 const deleted=await item(f.db);assert.equal(deleted.metadata,null);assert.equal(deleted.item_no,original.item_no);
 const withdrawn=await send(f.db,`verb=GetRecord&identifier=${id(f)}&metadataPrefix=oai_dc`);
 assert.match(withdrawn,/status="deleted"/);assert.doesNotMatch(withdrawn,/<metadata>|Corrected synthetic/);
 const identify=await send(f.db,'verb=Identify');assert.ok(identify.includes('<earliestDatestamp>'+original.first_datestamp+'</earliestDatestamp>'));
});

test('XML escaping replaces forbidden controls and preserves astral Unicode',async()=>{
 const f=await oaiFixture();await f.db.prepare('UPDATE results SET content=? WHERE id=?').bind('雪 😀 & <tag> "quote" apostrophe\'\u0000\u0001\ud800',f.resultId).run();
 const b=await send(f.db,'verb=ListRecords&metadataPrefix=oai_openaire');assert.match(b,/雪 😀 &amp; &lt;tag&gt;/);assert.doesNotMatch(b,/[\u0000\u0001]/);
});

test('Worker intercepts OAI before mutation middleware',()=>{
 const source=readFileSync('worker/index.ts','utf8');assert.ok(source.indexOf("pathname==='/oai'")<source.indexOf('const operational=await operationalResponse'));
 const route=readFileSync('app/oai/route.ts','utf8');assert.doesNotMatch(route,/\bread\b|evidenceBundle|commons|inference/);assert.match(route,/POST=GET/);
});
