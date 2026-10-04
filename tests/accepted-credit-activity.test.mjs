import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {oaiFixture} from './oai-fixture.mjs';
import {acceptedContributors} from '../lib/accepted-contributors.ts';
import {acceptedGallery} from '../lib/accepted-gallery.ts';
import {contributionReceipt} from '../lib/contribution-receipt.ts';
import {contributionReceiptResponse} from '../lib/contribution-receipt-http.ts';
import {publicActivity} from '../lib/activity.ts';
import {validateOaiXml} from './oai-xml.mjs';
import {oaiResponse} from '../lib/oai-pmh.ts';
const relay='346e9e0d-e81c-491d-9757-6d1f100249a2',stamp='2026-09-01T10:11:12.000Z';
async function addAgent(db,id,name,managed=0){await db.prepare("INSERT INTO agents(id,created_at,last_seen,name,description,capabilities,interests,token_hash,managed) VALUES (?,?,?,?,'Local fixture','[]','[]',?,?)").bind(id,stamp,stamp,name,'fixture-'+id,managed).run();}
async function assembly(f,sources){
 const id=crypto.randomUUID();
 await f.db.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence) VALUES (?,?,?,?,'Synthetic assembled work.','[]')").bind(id,stamp,f.taskId,relay).run();
 await f.db.prepare("INSERT INTO relay_finishing(state_key,task_id,created_at,status,source_version,source_result_ids,candidate_id) VALUES (?,?,1,'complete','local',?,?)").bind(crypto.randomUUID(),f.taskId,JSON.stringify(sources),id).run();
 // Independent final review supports this historical fixture's existing acceptance.
 await f.db.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES (?,?,?,?,'agree','Local independent final review.','[]',0.9)").bind(crypto.randomUUID(),stamp,id,f.reviewer).run();
 await f.db.prepare("UPDATE tasks SET accepted_result_id=? WHERE id=?").bind(id,f.taskId).run();
 return id;
}

test('recorded lineage credits multiple contributors once, follows nested assembly, and preserves submitter and reviewer identities',async()=>{
 const f=await oaiFixture();await addAgent(f.db,relay,'Resident guide renamed',1);
 const second=crypto.randomUUID();await addAgent(f.db,second,'Relay'); // Same display name is not the system identity.
 const secondResult=crypto.randomUUID();await f.db.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence) VALUES (?,?,?,?,'Second substantive finding.','[]')").bind(secondResult,stamp,f.taskId,second).run();
 const first=await assembly(f,[f.resultId,secondResult,f.resultId]);
 const candidate=await assembly(f,[first,f.resultId]);
 const credits=await acceptedContributors(f.db,candidate);assert.deepEqual(new Set(credits.map(a=>a.id)),new Set([f.producer,second]));assert.ok(!credits.some(a=>a.id===relay));
 assert.deepEqual(credits.find(a=>a.id===f.producer).source_result_ids,[f.resultId]);
 const r=await contributionReceipt(f.db,candidate);assert.equal(r.producing_agent,null);assert.equal(r.submitted_by.id,relay);assert.equal(r.contributing_agents.length,2);
 const html=await (await contributionReceiptResponse(f.db,new Request('https://opentaskrelay.org/receipts/'+candidate),candidate,'html')).text();assert.match(html,/By .*Fixture agent/);assert.doesNotMatch(html,/<p>By .*Resident guide/);
 const oai=await oaiResponse(f.db,new Request('https://opentaskrelay.org/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier='+encodeURIComponent('oai:opentaskrelay.org:bundle:'+f.taskId)));
 const xml=await oai.text();validateOaiXml(xml);assert.equal((xml.match(/<dc:creator>/g)||[]).length,2);assert.doesNotMatch(xml,/Resident guide/);
 assert.equal((await f.db.prepare('SELECT author FROM results WHERE id=?').bind(candidate).first()).author,relay);
 assert.equal((await f.db.prepare('SELECT author FROM verifications WHERE result_id=?').bind(candidate).first()).author,f.reviewer);
});

test('Relay never becomes fallback credit when legacy provenance is absent, cross-task, empty, or cyclic',async()=>{
 for(const scenario of ['absent','empty','cross-task','cyclic']){
  const f=await oaiFixture();await addAgent(f.db,relay,'Relay',1);
  const other=await oaiFixture(f.db);
  const candidate=await assembly(f,scenario==='cross-task'?[other.resultId]:[]);
  if(scenario==='absent')await f.db.prepare('DELETE FROM relay_finishing WHERE candidate_id=?').bind(candidate).run();
  if(scenario==='cyclic')await f.db.prepare('UPDATE relay_finishing SET source_result_ids=? WHERE candidate_id=?').bind(JSON.stringify([candidate]),candidate).run();
  assert.deepEqual(await acceptedContributors(f.db,candidate),[],scenario);
  assert.equal((await acceptedGallery(f.db)).find(a=>a.id===f.taskId).author,'');
  const receipt=await contributionReceipt(f.db,candidate);assert.equal(receipt.producing_agent,null);assert.deepEqual(receipt.contributing_agents,[]);assert.equal(receipt.submitted_by.id,relay);
  const projection=JSON.parse((await f.db.prepare('SELECT metadata FROM oai_items WHERE task_id=?').bind(f.taskId).first()).metadata);assert.equal(projection.author,'Unattributed');assert.deepEqual(projection.contributors,[]);
  for(const format of ['oai_dc','oai_openaire']){const xml=await (await oaiResponse(f.db,new Request('https://opentaskrelay.org/oai?verb=GetRecord&metadataPrefix='+format+'&identifier='+encodeURIComponent('oai:opentaskrelay.org:bundle:'+f.taskId)))).text();validateOaiXml(xml);assert.doesNotMatch(xml,/<dc:creator>|<datacite:creators>/);}
  assert.equal((await f.db.prepare('SELECT accepted_result_id FROM tasks WHERE id=?').bind(f.taskId).first()).accepted_result_id,candidate);
 }
});

test('unified public activity includes outside evidence, reviews, messages, discussion, Relay and public operations, with privacy boundaries',async()=>{
 const f=await oaiFixture(),db=f.db;await addAgent(db,relay,'Relay',1);
 const room=crypto.randomUUID();await db.prepare("INSERT INTO rooms(id,created_at,creator,name,description) VALUES (?,?,?,'Synthetic room','Local only')").bind(room,stamp,f.producer).run();
 const message=crypto.randomUUID(),hidden=crypto.randomUUID();
 for(const [id,content,hide] of [[message,'Previously missing outside agent message',0],[hidden,'PRIVATE_HIDDEN_MESSAGE',1]])await db.prepare("INSERT INTO messages(id,created_at,author,room_id,content,evidence,hidden) VALUES (?,?,?,?,?,'[]',?)").bind(id,stamp,f.producer,room,content,hide).run();
 const comment=crypto.randomUUID();await db.prepare("INSERT INTO board_comments(id,created_at,task_id,content,kind,content_hash) VALUES (?,?,?,'Public visitor discussion','note','PRIVATE_CONTENT_HASH')").bind(comment,stamp,f.taskId).run();
 const hiddenComment=crypto.randomUUID();await db.prepare("INSERT INTO board_comments(id,created_at,task_id,content,kind,content_hash,hidden) VALUES (?,?,?,'PRIVATE_HIDDEN_COMMENT','note','synthetic-hidden-hash',1)").bind(hiddenComment,stamp,f.taskId).run();
 await db.prepare("INSERT INTO events(id,created_at,action,entity_type,entity_id,summary) VALUES ('hidden-comment-mirror',?,'created','board_comments',?,'PRIVATE_HIDDEN_COMMENT'),('public-comment-moderation',?,'comment hidden','board_comments',?,'Moderator action. Original and reason retained privately for abuse review.')").bind(stamp,hiddenComment,stamp,hiddenComment).run();
 const events=[['relay','candidate assembled','tasks',f.taskId,relay,'Relay consolidated the findings.'],['maintenance','maintenance completed','system','weekly',null,'Public maintenance completed.'],['reservation','review started','results',f.resultId,f.reviewer,'Review reserved.'],['message-mirror','created','messages',message,f.producer,'Previously missing outside agent message'],['hidden-mirror','created','messages',hidden,f.producer,'PRIVATE_HIDDEN_MESSAGE'],['message-coordination','review started','messages',message,f.reviewer,'Public message coordination.'],['private','diagnostic','private_logs','secret',null,'PRIVATE_INTERNAL_DIAGNOSTIC'],['moderation','moderated','tasks',f.taskId,null,'PRIVATE_MODERATION_REASON']];
 for(const [id,action,type,entity,actor,summary] of events)await db.prepare('INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) VALUES (?,?,?,?,?,?,?)').bind(id,stamp,actor,action,type,entity,summary).run();
 const all=(await publicActivity(db,'all')).items;
 for(const id of [f.resultId,f.reviewId,message,comment,'relay','maintenance','reservation','message-coordination','public-comment-moderation'])assert.ok(all.some(e=>e.id===id),id+' belongs to All activity');
 assert.equal(all.filter(e=>e.summary==='Previously missing outside agent message').length,1);
 assert.doesNotMatch(JSON.stringify(all),/PRIVATE_HIDDEN_MESSAGE|PRIVATE_HIDDEN_COMMENT|PRIVATE_CONTENT_HASH|PRIVATE_INTERNAL_DIAGNOSTIC|PRIVATE_MODERATION_REASON|PRIVATE_VISITOR/);
 assert.equal(all.find(e=>e.id==='reservation').task_id,f.taskId);
 assert.deepEqual((await publicActivity(db)).items,all,'Recent defaults to the same full public universe');
 for(const [filter,kind] of [['contributions','contribution'],['reviews','review'],['accepted','accepted'],['discussion','discussion']])assert.deepEqual((await publicActivity(db,filter)).items,all.filter(e=>e.kind===kind));
 await db.prepare('UPDATE agents SET posting_restricted=1 WHERE id=?').bind(f.producer).run();assert.ok(!(await publicActivity(db)).items.some(e=>e.id===message));
});

test('history-wide literal search and cursor pagination survive timestamp ties and newly arriving activity without skips or duplicates',async()=>{
 const f=await oaiFixture(),db=f.db;
 for(let i=0;i<143;i++)await db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) VALUES (?,?,?,'handoff updated','tasks',?,?)").bind('old-'+String(i).padStart(3,'0'),i===0?'2024-01-01T00:00:00Z':'2026-09-02T00:00:00.000Z',f.producer,f.taskId,i===0?'Ancient needle % _':'Public handoff').run();
 const first=await publicActivity(db,'all',0,7),expected=[],recent=(await publicActivity(db)).items;
 let current=first;while(true){expected.push(...current.items);if(!current.next_cursor)break;current=await publicActivity(db,'all',0,7,{cursor:current.next_cursor});}
 assert.deepEqual(recent,expected.slice(0,60));assert.equal(new Set(expected.map(e=>e.kind+':'+e.id)).size,expected.length);
 await db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) VALUES ('brand-new','2026-09-03T00:00:00Z',?,'released','tasks',?,'New arrival')").bind(f.producer,f.taskId).run();
 const visited=[...first.items];current=first;
 while(current.next_cursor){current=await publicActivity(db,'all',0,7,{cursor:current.next_cursor});visited.push(...current.items);}
 assert.deepEqual(visited,expected,'New records cannot shift older page boundaries');
 assert.ok(!first.items.some(e=>e.id==='old-000'));
 for(const search of ['Ancient needle % _',f.taskId,'handoff updated']){
  const page=await publicActivity(db,'all',0,7,{search});assert.ok(page.items.length);if(search.startsWith('Ancient'))assert.deepEqual(page.items.map(e=>e.id),['old-000']);
 }
 const agentSearch=await publicActivity(db,'all',0,60,{search:'Fixture agent'});assert.ok(agentSearch.items.every(e=>e.actor===f.producer));
 const changed=await publicActivity(db,'all',0,7,{search:'Ancient needle',cursor:first.next_cursor});assert.deepEqual(changed.items.map(e=>e.id),['old-000'],'Changing a search resets its cursor');
});

test('Activity UI has one primary All activity control and server-backed older history search',()=>{
 const page=readFileSync(new URL('../app/activity/page.tsx',import.meta.url),'utf8');assert.doesNotMatch(page,/Site operations|groupActivity|publicData/);assert.match(page,/\['all','All activity'\]/);assert.match(page,/role="search"/);assert.match(page,/cursor:q.cursor/);assert.match(page,/Recent activity/);assert.match(page,/rel="next"/);
});
