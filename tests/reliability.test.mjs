import {createTaskFixture} from './task-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {recordOwnerVerification} from '../lib/owner-verification.ts';
import {mcp} from '../lib/protocols.ts';
import {testDatabase} from './test-db.mjs';
import {handle,read,schemas} from '../lib/commons.ts';
import {publicHttpsUrl} from '../lib/sources.ts';
import {reviewQueue} from '../lib/reviews.ts';
import {egressManifest} from '../lib/egress.ts';
import {openapi} from '../lib/openapi.ts';
import {applyReliabilityRelease} from '../lib/reliability-release.ts';
import {launchMissions} from '../lib/missions.ts';
import {publicProblems} from '../lib/public-work.ts';
import {readFileSync} from 'node:fs';
import {hash,insert,register as registerRecord,taskContract} from '../lib/commons.ts';
import {applyOwnerAcceptanceRelease} from '../lib/owner-acceptance-release.ts';
import {publicInterestLegs} from '../lib/public-interest-legs.ts';
import {ensureLaunchProblems} from '../lib/seed-problems.ts';
import {acceptReviewed,moderationQueue} from '../lib/moderation.ts';
import {statusLabel} from '../lib/public-work.ts';
import {homepageTasks,homepageTaskIds} from '../lib/homepage-tasks.ts';

const acceptedFixtures=JSON.parse(readFileSync(new URL('./fixtures/owner-acceptances.synthetic.json',import.meta.url)));
const ownerAcceptanceDecisions=await Promise.all(acceptedFixtures.map(async f=>({task_id:f.task_id,result_id:f.result_id,revision:3,content_sha256:await hash(f.content),criteria_sha256:await hash(JSON.stringify(f.acceptance_criteria)),reason:'Synthetic fixture decision; not a production acceptance.'})));
async function acceptanceFixture(){
 const db=testDatabase(),stamp=new Date().toISOString();
 const owner=(await registerRecord(db,{name:'Fixture owner',description:'Local acceptance regression'},'fixture-owner')).agent;
 const producer=(await registerRecord(db,{name:'Fixture producer',description:'Local acceptance regression'},'fixture-producer')).agent;
 const reviewer=(await registerRecord(db,{name:'Fixture reviewer',description:'Local acceptance regression'},'fixture-reviewer')).agent;
 await db.prepare('UPDATE agents SET managed=1 WHERE id IN (?,?)').bind(owner.id,producer.id).run();
 for(const f of acceptedFixtures){
  const protocol={...taskContract.parse({acceptance_criteria:f.acceptance_criteria}),revision:3};
  await db.batch([
   insert(db,'tasks',{id:f.task_id,created_at:stamp,updated_at:stamp,creator:owner.id,assignee:producer.id,title:f.title,description:f.description,required_capabilities:[],protocol,status:'verified',moderation_status:'approved'}),
   insert(db,'results',{id:f.result_id,created_at:stamp,task_id:f.task_id,author:producer.id,content:f.content,evidence:f.evidence}),
   insert(db,'verifications',{id:crypto.randomUUID(),created_at:stamp,result_id:f.result_id,author:reviewer.id,verdict:'agree',completeness:'complete',content:'Local fixture review, not a production contribution.',evidence:[],confidence:0.8})
  ]);
 }
 return {db,owner,producer,reviewer};
}

test('owner-selected completions preserve real review gates, evidence and snapshots without duplicate acceptance',async()=>{
 const {db}=await acceptanceFixture();
 const participation=()=>db.prepare('SELECT (SELECT count(*) FROM results) results,(SELECT count(*) FROM verifications) reviews,(SELECT count(*) FROM agents) agents').first();
 const before=await participation();
 await applyOwnerAcceptanceRelease(db,ownerAcceptanceDecisions);await applyOwnerAcceptanceRelease(db,ownerAcceptanceDecisions);
 // A second caller can observe completion inside write() after it already
 // passed an earlier read. The shared moderator operation must also dedupe.
 const first=ownerAcceptanceDecisions[0];
 await acceptReviewed(db,{task_id:first.task_id,result_id:first.result_id,reason:first.reason,criteria_checked:true});
 for(const d of ownerAcceptanceDecisions){
  const t=await db.prepare('SELECT * FROM tasks WHERE id=?').bind(d.task_id).first();
  assert.equal(t.status,'completed');assert.equal(t.accepted_result_id,d.result_id);
  const s=await db.prepare('SELECT * FROM acceptance_snapshots WHERE result_id=?').bind(d.result_id).first();
  assert.equal(s.revision,3);assert.deepEqual(JSON.parse(s.protocol).acceptance_criteria,acceptedFixtures.find(f=>f.task_id===d.task_id).acceptance_criteria);
 }
 assert.deepEqual(await participation(),before);
 assert.equal((await db.prepare("SELECT count(*) n FROM events WHERE action='acceptance explanation'").first()).n,3);
});

test('fixed owner decisions refuse disputed, unreviewed, site-reviewed or changed work',async()=>{
 const cases=[
  "UPDATE verifications SET verdict='dispute'",
  'DELETE FROM verifications',
  'UPDATE agents SET managed=1',
  "UPDATE tasks SET protocol=json_set(protocol,'$.revision',4)",
  "UPDATE tasks SET protocol=json_set(protocol,'$.acceptance_criteria[0]','Changed criterion')",
  "UPDATE results SET content=content||' Changed after inspection.'"
 ];
 for(const sql of cases){
  const {db}=await acceptanceFixture();await db.prepare(sql).run();
  await applyOwnerAcceptanceRelease(db,ownerAcceptanceDecisions);
  assert.equal((await db.prepare('SELECT count(*) n FROM tasks WHERE accepted_result_id IS NOT NULL').first()).n,0,sql);
  assert.equal((await db.prepare('SELECT count(*) n FROM acceptance_snapshots').first()).n,0,sql);
 }
});

test('eight external public-interest legs are executable, claimable and seeded once without invented participation',async()=>{
 const db=testDatabase();await launchMissions(db);await ensureLaunchProblems(db);
 assert.equal(publicInterestLegs.length,8);
 for(const {id,...brief} of publicInterestLegs){
  schemas.tasks.parse({...brief,relay_leg_minutes:5}); // Historical seed budgets are retained, not new input contracts.
  assert.ok(brief.relay_leg_minutes>=5&&brief.relay_leg_minutes<=10);
  assert.ok(brief.next_action_sources.length>0);
  for(const url of brief.next_action_sources)assert.ok(!new URL(url).hostname.includes('opentaskrelay'));
  const t=await db.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first();
  assert.equal(t.status,'open');assert.equal(t.moderation_status,'approved');
 }
 const first=publicInterestLegs[0].id;
 await db.prepare("UPDATE tasks SET status='submitted' WHERE id=?").bind(first).run();
 // A fresh D1 wrapper models the next Worker isolate and repeats the release.
 await ensureLaunchProblems({prepare:db.prepare.bind(db),batch:db.batch.bind(db)});
 assert.equal((await db.prepare('SELECT status FROM tasks WHERE id=?').bind(first).first()).status,'submitted');
 for(const {id} of publicInterestLegs)assert.equal((await db.prepare('SELECT count(*) n FROM tasks WHERE id=?').bind(id).first()).n,1);
 assert.equal((await db.prepare('SELECT count(*) n FROM results').first()).n,0);
 assert.equal((await db.prepare('SELECT count(*) n FROM verifications').first()).n,0);
});

function fixture(){const db=testDatabase();let ip=10;return {db,async call(path,body,token,status=body===undefined?200:201){const req=new Request('https://opentaskrelay.org/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:{'CF-Connecting-IP':'192.0.2.'+ip++,...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const r=await handle(db,req),j=await r.json();assert.equal(r.status,status,JSON.stringify(j.error||{unexpected_status:r.status}));return j;}};}
const register=async(f,name,operator)=> (await f.call('agents',{name,description:'Isolated regression fixture',...(operator?{operator}:{})})).data;
async function task(f,creator,more={}){const t=await createTaskFixture(f.db,{title:'Bounded fixture task',description:'Check one cited fact and explain the evidence.',risk_level:'low',...more},creator.agent);await f.db.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(t.id).run();return t;}
const vote=(result_id,verdict='agree')=>({result_id,verdict,completeness:'complete',content:'Checked the stated criterion against the source; limited to this fixture.',evidence:['https://example.org/source'],confidence:0.8});
const stale={result_kind:'premise_stale',content:'The required resource is no longer listed by the publisher.',evidence:['https://example.org/manifest'],premise:{failed_assumption:'The manifest provides a JSON export.',affected_source:'https://example.org/manifest',repairable:true,suggested_creator_action:'Link two existing resources and revise the handoff.'},submission_key:'stale-fixture-001'};

test('acceptance readiness requires explicit completeness, while partial and legacy agreement stay reviewed',async()=>{
 for(const completeness of ['complete','partial',undefined]){
  const f=fixture(),creator=await register(f,'Readiness owner'),worker=await register(f,'Readiness producer'),reviewer=await register(f,'Readiness reviewer');
  await f.db.prepare('UPDATE agents SET managed=1 WHERE id=?').bind(creator.agent.id).run();
  const t=await task(f,creator,{acceptance_criteria:['Check both source entries.']});
  await f.call('tasks/'+t.id+'/claim',{},worker.token);
  const ready=completeness==='complete';
  const result=(await f.call('tasks/'+t.id+'/results',{content:ready?'Both entries checked.':'Only the first entry is checked; this is partial progress.',evidence:['https://example.org/source']},worker.token)).data;
  const review={...vote(result.id),content:ready?'Both entries independently checked; every criterion is met.':'Accurate and useful partial progress. The second entry and acceptance criterion remain unmet.'};
  if(completeness)review.completeness=completeness;else delete review.completeness;
  await f.call('tasks/'+t.id+'/verifications',review,reviewer.token);
  const detail=(await f.call('tasks/'+t.id)).data;
  assert.equal(detail.status,'verified','Validity agreement remains recorded');
  assert.equal(detail.acceptance_ready,ready);
  assert.equal(detail.status_label,ready?'Review-qualified · owner verification required':'Reviewed · completion not established');
  assert.equal(detail.independent_check_count,1);
  const saved=detail.results.find(r=>r.id===result.id);
  assert.equal(saved.review_status,ready?'reviewed':'reviewed_incomplete');
  assert.equal(saved.acceptance_status,ready?'awaiting_acceptance':'completion_not_established');
  assert.equal(saved.consensus.votes[0].completeness,completeness||'unknown');
  assert.equal(saved.consensus.votes[0].content,review.content);
  assert.equal((await reviewQueue(f.db,100,0,t.id)).total,0,'Partial agreement still counts as a first independent review');
  for(const query of ['', '?sort=newest', '?view=summary']){
   const row=(await f.call('tasks'+query)).data.items.find(x=>x.id===t.id);
   assert.equal(row.acceptance_ready,ready);assert.equal(row.status_label,detail.status_label);
  }
  for(const row of [(await f.call('search?q=Bounded')).data.tasks.find(x=>x.id===t.id),(await f.call('agents/'+creator.agent.id)).data.tasks.find(x=>x.id===t.id)]){
   assert.equal(row.acceptance_ready,ready);assert.equal(row.status_label,detail.status_label);
  }
  const listed=(await f.call('tasks/'+t.id+'/results')).data.items.find(r=>r.id===result.id);
  const individual=(await f.call('results/'+result.id)).data;
  assert.equal(listed.review_status,saved.review_status);assert.equal(individual.review_status,saved.review_status);
  assert.equal(individual.acceptance_ready,ready);
  assert.equal((await publicProblems(f.db,{status:'verified'})).some(x=>x.id===t.id),ready);
  assert.equal((await moderationQueue(f.db)).reviewable.some(x=>x.id===t.id),ready);
  const input={task_id:t.id,result_id:result.id,reason:'Checked every criterion against the result and primary evidence.',criteria_checked:true};
  if(ready){
   await acceptReviewed(f.db,input);
   // Model an accepted record created before completeness existed.
   await f.db.prepare("UPDATE verifications SET completeness='unknown' WHERE result_id=?").bind(result.id).run();
   const accepted=(await f.call('tasks/'+t.id)).data;
   assert.equal(accepted.status,'completed');assert.equal(accepted.status_label,'Accepted result');
   assert.equal(accepted.results[0].review_status,'accepted');assert.equal(accepted.accepted_result_id,result.id);
   await f.call('tasks/'+t.id+'/complete',{result_id:result.id},creator.token);
   assert.ok((await f.call('solved')).data.items.some(x=>x.id===t.id));
  }else{
   assert.equal((await f.call('tasks/'+t.id+'/complete',{result_id:result.id},creator.token,409)).error.code,'INCOMPLETE');
   await assert.rejects(()=>acceptReviewed(f.db,input),e=>e.code==='INCOMPLETE');
  }
 }
});

test('complete agreement cannot override an independent partial assessment or a concurrent partial review',async()=>{
 for(const concurrent of [false,true]){
  const f=fixture(),creator=await register(f,'Conflict owner'),worker=await register(f,'Conflict producer'),reviewer=await register(f,'Complete reviewer'),partial=await register(f,'Partial reviewer');
  const t=await task(f,creator);await f.call('tasks/'+t.id+'/claim',{},worker.token);
  const r=(await f.call('tasks/'+t.id+'/results',{content:'Candidate result'},worker.token)).data;
  await f.call('tasks/'+t.id+'/verifications',vote(r.id),reviewer.token);
  const addPartial=()=>insert(f.db,'verifications',{id:crypto.randomUUID(),created_at:new Date().toISOString(),result_id:r.id,author:partial.agent.id,verdict:'agree',completeness:'partial',content:'Accurate but incomplete.',evidence:[],confidence:1}).run();
  if(concurrent){
   const batch=f.db.batch.bind(f.db);
   f.db.batch=async statements=>{if(statements.some(s=>s.query.includes("UPDATE tasks SET status='completed'"))){f.db.batch=batch;await addPartial();}return batch(statements);};
  }else await addPartial();
  await f.call('tasks/'+t.id+'/complete',{result_id:r.id},creator.token,409);
  const detail=(await f.call('tasks/'+t.id)).data;
  assert.equal(detail.accepted_result_id,null);assert.equal(detail.acceptance_ready,false);
  assert.equal(detail.results[0].review_status,'reviewed_incomplete');
 }
});

test('homepage labels legacy reviewed partial progress without implying acceptance',async()=>{
 const f=fixture(),creator=await register(f,'Home owner'),worker=await register(f,'Home producer'),reviewer=await register(f,'Home reviewer');
 const t=await task(f,creator);
 // Use a selected homepage ID without changing the real seed tasks.
 await f.db.prepare('UPDATE tasks SET id=? WHERE id=?').bind(homepageTaskIds[0],t.id).run();t.id=homepageTaskIds[0];
 await f.call('tasks/'+t.id+'/claim',{},worker.token);
 const r=(await f.call('tasks/'+t.id+'/results',{content:'Useful partial progress'},worker.token)).data;
 await f.call('tasks/'+t.id+'/verifications',{...vote(r.id),completeness:'partial'},reviewer.token);
 const home=(await homepageTasks(f.db)).find(x=>x.id===t.id);
 assert.equal(home.acceptance_ready,false);assert.equal(statusLabel(home),'Reviewed · completion not established');
});

test('ordinary guide retry rules preserve one receipt and stop on state or payload conflicts',async()=>{
 const f=fixture(),creator=await register(f,'Guide creator'),worker=await register(f,'Guide contributor'),other=await register(f,'Guide follow-up');
 const t=await task(f,creator),path='tasks/'+t.id+'/results';
 const payload={content:'  One bounded finding.  ',evidence:['https://example.org/a','https://example.org/b'],confidence:0.8,submission_key:'guide-retry-001'};
 await f.call(path,payload,undefined,401);
 await f.call(path,payload,worker.token,409); // Open contributions need a claim.
 await f.call('tasks/'+t.id+'/claim',{},worker.token);
 await f.call('tasks/'+t.id+'/claim',{},other.token,409);
 const saved=(await f.call(path,payload,worker.token)).data;
 assert.equal(saved.result_kind,schemas.results.parse({content:'finding'}).result_kind);
 assert.equal(saved.content,payload.content.trim());
 const retry=(await f.call(path,payload,worker.token)).data;
 assert.equal(retry.id,saved.id);assert.equal(retry.result_url,saved.result_url);
 // Runtime compares normalized values; retaining the entire original payload is sufficient.
 const explicit={...payload,content:payload.content.trim(),result_kind:saved.result_kind};
 assert.equal((await f.call(path,explicit,worker.token)).data.id,saved.id);
 for(const changed of [{content:'Different finding.'},{evidence:[...payload.evidence].reverse()},{evidence:[]},{confidence:0.7},{confidence:undefined},{result_kind:'premise_stale',premise:stale.premise}]){
  const conflict=await f.call(path,{...payload,...changed},worker.token,409);
  assert.equal(conflict.error.code,'IDEMPOTENCY_CONFLICT');
 }
 assert.equal((await f.call(path)).data.items.length,1);
 // Submitted tasks permit follow-ups without taking a claim. Key scope includes author.
 const followUp=(await f.call(path,payload,other.token)).data;assert.notEqual(followUp.id,saved.id);
 const another=await task(f,creator);await f.call('tasks/'+another.id+'/claim',{},worker.token);
 assert.notEqual((await f.call('tasks/'+another.id+'/results',payload,worker.token)).data.id,saved.id,'Key scope also includes task');
 for(const [sql,code] of [
  ["UPDATE tasks SET protocol=json_set(protocol,'$.expires_at','2000-01-01T00:00:00Z') WHERE id=?",'TASK_EXPIRED'],
  ["UPDATE tasks SET protocol=json_remove(protocol,'$.expires_at'),status='closed' WHERE id=?",'TASK_CLOSED'],
  ["UPDATE tasks SET status='submitted',moderation_status='quarantined' WHERE id=?",'TASK_NOT_APPROVED'],
 ]){
  await f.db.prepare(sql).bind(t.id).run();
  assert.equal((await f.call(path,payload,worker.token,409)).error.code,code);
  if(code==='TASK_NOT_APPROVED')assert.equal((await f.call('results/'+saved.id,undefined,undefined,404)).error.code,'NOT_FOUND');else assert.equal((await f.call('results/'+saved.id)).data.id,saved.id);assert.equal((await f.db.prepare('SELECT id FROM results WHERE id=?').bind(saved.id).first()).id,saved.id,'Blocked replay does not erase the stored result');
 }
});

test('POST 201 is immediately readable in task results and task detail before review',async()=>{
 const f=fixture(),creator=await register(f,'Read-after-write creator'),worker=await register(f,'Read-after-write worker');
 const t=await task(f,creator);await f.call('tasks/'+t.id+'/claim',{},worker.token);
 const payload={content:'Checked the bounded fixture. This is partial work awaiting an independent check.',evidence:[],submission_key:'read-after-write-001'};
 const post=await handle(f.db,new Request('https://opentaskrelay.org/api/tasks/'+t.id+'/results',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+worker.token},body:JSON.stringify(payload)}));
 assert.equal(post.status,201);assert.equal(post.headers.get('location'),null);
 const saved=(await post.json()).data;assert.equal(saved.result_url,'https://opentaskrelay.org/tasks/'+t.id+'#result-'+saved.id);
 for(const prefix of ['/api/tasks/','/api/v1/tasks/']){
  const get=await handle(f.db,new Request('https://opentaskrelay.org'+prefix+t.id+'/results'));
  assert.equal(get.status,200);assert.equal(get.headers.get('cache-control'),'no-store');assert.equal(get.headers.get('location'),null);
  const list=(await get.json()).data;assert.equal(list.items.length,1);assert.equal(list.next_offset,null);
  const result=list.items[0];assert.equal(result.id,saved.id);assert.equal(result.content,payload.content);assert.equal(result.task_id,t.id);
  assert.equal(result.submission_status,'submitted');assert.equal(result.review_status,'awaiting_review');assert.equal(result.acceptance_status,'pending_review');
  const detail=(await (await handle(f.db,new Request('https://opentaskrelay.org'+prefix+t.id))).json()).data;
  assert.deepEqual(detail.results.find(r=>r.id===saved.id),result);assert.equal(detail.verification_requested,1);assert.equal(detail.accepted_result_id,null);
 }
 assert.equal((await f.call('tasks/'+t.id+'/results',payload,worker.token)).data.id,saved.id);
 assert.equal((await f.call('tasks/'+t.id+'/results')).data.items.length,1,'Identical retry must not duplicate the result');
 const second=(await f.call('tasks/'+t.id+'/results',{...payload,content:'Another bounded observation for pagination.',submission_key:'read-after-write-002'},worker.token)).data;
 const firstPage=(await f.call('tasks/'+t.id+'/results?limit=1')).data;
 const secondPage=(await f.call('tasks/'+t.id+'/results?limit=1&offset='+firstPage.next_offset)).data;
 assert.equal(firstPage.next_offset,1);assert.equal(secondPage.next_offset,null);
 assert.deepEqual(new Set([...firstPage.items,...secondPage.items].map(r=>r.id)),new Set([saved.id,second.id]));
 const other=await task(f,creator);
 assert.deepEqual((await f.call('tasks/'+other.id+'/results?task_id='+t.id)).data.items,[],'Query cannot override the task in the path');
 await f.call('tasks/'+crypto.randomUUID()+'/results',undefined,undefined,404);
 await f.call('tasks/'+t.id+'/results/unknown',undefined,undefined,404);
});

test('credential rotation, revocation and one-use recovery preserve identity and exclude secrets',async()=>{
 const f=fixture(),a=await register(f,'Original agent');assert.match(a.recovery_key,/^acr_/);
 const meta=(await f.call('agents/me/credentials',undefined,a.token)).data;assert.equal(meta.version,1);assert.equal(meta.recovery_configured,true);
 const publicAgent=(await f.call('agents/'+a.agent.id)).data;assert.equal(publicAgent.token_hash,undefined);assert.equal(publicAgent.recovery_hash,undefined);
 await f.call('agents/me/credentials',undefined,undefined,401);
 await f.call('agents/me/rotate',{expected_version:2},a.token,409);
 await f.call('agents/me/recovery',{expected_version:1},a.token,409);
 const next=(await f.call('agents/me/rotate',{expected_version:1},a.token)).data;assert.equal(next.agent_id,a.agent.id);assert.equal(next.version,2);
 await f.call('agents/me/credentials',undefined,a.token,401);
 await f.call('agents/me/revoke',{expected_version:2},next.token);
 await f.call('agents/me/credentials',undefined,next.token,401);
 const recovered=(await f.call('agents/recover',{agent_id:a.agent.id,recovery_key:a.recovery_key})).data;assert.equal(recovered.agent_id,a.agent.id);assert.equal(recovered.version,4);
 await f.call('agents/recover',{agent_id:a.agent.id,recovery_key:a.recovery_key},undefined,401);
 assert.equal((await f.call('agents/me/credentials',undefined,recovered.token)).data.version,4);
 await f.call('agents',{name:'Leaking agent',description:recovered.recovery_key},undefined,422);
 const serialized=JSON.stringify((await f.call('feed')).data);for(const secret of [a.token,a.recovery_key,next.token,recovered.token,recovered.recovery_key])assert.ok(!serialized.includes(secret));
 assert.equal((await f.call('agents')).data.items.filter(x=>x.id===a.agent.id).length,1);
 assert.equal((await f.db.prepare('SELECT count(*) n FROM agents WHERE managed=0').first()).n,1);
});

test('legacy agents can configure recovery once; bearer credentials cannot replace it',async()=>{
 const f=fixture(),a=await register(f,'Legacy agent');await f.db.prepare('UPDATE agents SET recovery_hash=NULL,credential_created_at=NULL WHERE id=?').bind(a.agent.id).run();
 assert.equal((await f.call('agents/me',undefined,a.token)).data.recovery_configured,false);
 const proof=(await f.call('agents/me/recovery',{expected_version:1},a.token)).data;
 await f.call('agents/me/recovery',{expected_version:1},a.token,409);
 await f.call('agents/recover',{agent_id:crypto.randomUUID(),recovery_key:proof.recovery_key},undefined,401);
 await f.db.prepare("UPDATE agents SET status='suspended' WHERE id=?").bind(a.agent.id).run();
 await f.call('agents/recover',{agent_id:a.agent.id,recovery_key:proof.recovery_key},undefined,401);
});

test('racing credential change rolls back atomically',async()=>{
 const f=fixture(),a=await register(f,'Rotation race'),batch=f.db.batch.bind(f.db);let intercept=true;
 f.db.batch=async statements=>{if(intercept&&statements.some(s=>s.query.includes('UPDATE agents SET token_hash='))){intercept=false;await f.db.prepare('UPDATE agents SET credential_version=credential_version+1 WHERE id=?').bind(a.agent.id).run();}return batch(statements);};
 await f.call('agents/me/rotate',{expected_version:1},a.token,409);
 assert.equal((await f.call('agents/me',undefined,a.token)).data.version,2);
 assert.equal((await f.call('feed')).data.items.filter(e=>e.action==='credential rotated').length,0);
});

test('stale premise is useful work, not a JSON artifact or a self-accepted result',async()=>{
 const f=fixture(),creator=await register(f,'Creator','Owner'),worker=await register(f,'Worker','Worker operator'),reviewer=await register(f,'Reviewer','Reviewer operator');
 const t=await task(f,creator,{output_format:'json',required_output_keys:['finding']});
 const submitted=await f.call('tasks/'+t.id+'/results',stale,worker.token);assert.ok(submitted.data.result_url.endsWith('#result-'+submitted.data.id));assert.equal(submitted.result_url,submitted.data.result_url);assert.equal(submitted.data.result_kind,'premise_stale');
 assert.equal((await f.call('tasks/'+t.id+'/results',stale,worker.token)).data.id,submitted.data.id);
 await f.call('tasks/'+t.id+'/results',{...stale,premise:{...stale.premise,repairable:false}},worker.token,409);
 const detail=(await f.call('tasks/'+t.id)).data;assert.equal(detail.creator_action_required,true);assert.equal(detail.results[0].review_status,'awaiting_review');
 await f.call('tasks/'+t.id+'/verifications',vote(submitted.data.id),worker.token,403);
 await f.call('tasks/'+t.id+'/verifications',vote(submitted.data.id),reviewer.token);
 assert.equal((await f.call('tasks/'+t.id)).data.status,'premise_stale');
 await f.call('tasks/'+t.id+'/complete',{result_id:submitted.data.id},creator.token,409);
 await f.call('tasks/'+t.id+'/results',{content:'{"finding":"done"}'},worker.token,409);
 const repaired=(await f.call('tasks/'+t.id+'/handoff',{next_action:'Inspect this repaired source and record a bounded finding.',source_urls:['https://example.org/repaired'],desired_output:'One cited factual finding.',useful_progress:'One accurate source comparison.',max_minutes:5,kind:'contribution',expected_revision:1,reason:'Replace the retired resource with its current exact replacement.'},creator.token)).data;
 assert.equal(repaired.status,'open');assert.equal(repaired.revision,2);assert.equal((await f.call('tasks/'+t.id)).data.creator_action_required,false);
 const second=await register(f,'Another reviewer');await f.call('tasks/'+t.id+'/verifications',vote(submitted.data.id),second.token,409);
 await f.call('tasks/'+t.id+'/claim',{},worker.token);await f.call('tasks/'+t.id+'/results',{content:'not JSON'},worker.token,422);
});

test('review reservations expire and enforce role and declared operator boundaries',async()=>{
 const f=fixture(),creator=await register(f,'Creator','Owner'),worker=await register(f,'Worker','Producer'),same=await register(f,'Same operator','Producer'),reviewer=await register(f,'Reviewer','Independent'),other=await register(f,'Other reviewer','Second');
 const t=await task(f,creator);await f.call('tasks/'+t.id+'/claim',{},worker.token);const r=(await f.call('tasks/'+t.id+'/results',{content:'A partial result with evidence.'},worker.token)).data;
 await f.call('tasks/'+t.id+'/review-claim',{result_id:r.id},creator.token,403);await f.call('tasks/'+t.id+'/review-claim',{result_id:r.id},same.token,403);await f.call('tasks/'+t.id+'/verifications',vote(r.id),same.token,403);
 const q=(await f.call('reviews')).data;assert.equal(q.total,1);assert.equal(q.items[0].result_id,r.id);assert.equal(q.awaiting_review,1);
 await f.call('tasks/'+t.id+'/review-claim',{result_id:r.id,minutes:5},reviewer.token);assert.equal((await f.call('reviews')).data.under_review,1);assert.equal((await f.call('tasks/'+t.id)).data.results[0].review_status,'under_review');
 await f.call('tasks/'+t.id+'/verifications',vote(r.id),other.token,409);
 await f.db.prepare("UPDATE review_claims SET expires_at='2000-01-01T00:00:00Z' WHERE result_id=?").bind(r.id).run();
 await f.call('tasks/'+t.id+'/review-claim',{result_id:r.id},other.token);await f.call('tasks/'+t.id+'/verifications',vote(r.id,'dispute'),other.token);
 assert.equal((await f.call('reviews')).data.total,0);assert.equal((await f.call('tasks/'+t.id)).data.results[0].review_status,'needs_revision');assert.equal((await f.call('tasks/'+t.id)).data.accepted_result_id,null);
});

test('source expectations and network manifest reject unsafe and unrelated resources',async()=>{
 const credentialUrl=new URL('https://example.org');credentialUrl.username='fixture';credentialUrl.password='example';
 for(const u of ['http://example.org','https://127.0.0.1','https://2130706433','https://[::1]','https://local.internal/',credentialUrl.href,'https://example.org:444','https://localhost.'])assert.equal(publicHttpsUrl.safeParse(u).success,false,u);
 const f=fixture(),creator=await register(f,'Source creator');
 await assert.rejects(()=>createTaskFixture(f.db,{title:'Bad source metadata',description:'Mismatch source expectation',next_action_sources:['https://example.org/a'],source_expectations:[{url:'https://example.org/b',row_count:5}]},creator.agent),{code:'SOURCE_MISMATCH'});
 const t=await task(f,creator,{next_action_sources:['https://example.org/a'],source_expectations:[{url:'https://example.org/a',row_count:5,headers:['Code'],redirect_hosts:['cdn.example.org']}]});
 const e=await egressManifest(f.db);assert.deepEqual(e.required_first_party_hosts,['opentaskrelay.org']);assert.ok(e.task_source_hosts.includes('example.org'));assert.ok(e.task_source_hosts.includes('cdn.example.org'));assert.equal((await f.call('tasks/'+t.id)).data.relay_leg.source_expectations[0].row_count,5);
});

test('launch audit archives invalid handoffs, preserves records, and is idempotent',async()=>{
 const f=fixture();await launchMissions(f.db);await read(f.db,['tasks'],new URLSearchParams());
 const closed=await f.db.prepare("SELECT id,title FROM tasks WHERE status='closed'").all();assert.equal(closed.results.length,2);
 const before=(await f.call('feed')).data.items.length;await applyReliabilityRelease(f.db);assert.equal((await f.call('feed')).data.items.length,before);
 const visible=await publicProblems(f.db,{});assert.equal(visible.length,100);assert.ok(visible.every(t=>!t.title.includes('country-list')&&!t.title.includes('historical newspaper')));
 for(const r of closed.results){const t=(await f.call('tasks/'+r.id)).data;assert.ok(t.contract_history.length>=2);assert.ok(t.source_audit.reason);}
});

test('OpenAPI derives request limits and documents authentication and result envelope',()=>{
 const api=openapi('https://opentaskrelay.org');assert.equal(api.components.schemas.Agent.properties.name.minLength,2);assert.equal(api.components.schemas.Result.properties.result_kind.default,'contribution');assert.deepEqual(api.paths['/agents/me/credentials'].get.security,[{agentToken:[]}]);assert.deepEqual(api.paths['/agents/recover'].post.security,[]);assert.ok(api.paths['/tasks/{id}/results'].post.responses['201'].content['application/json'].schema.properties.data.required.includes('result_url'));
 assert.ok(api.paths['/tasks/{id}/results'].get.responses['200'].content['application/json'].schema.properties.data.required.includes('items'));
 assert.ok(schemas.results.safeParse(stale).success);assert.equal(schemas.results.safeParse({...stale,premise:undefined}).success,false);
});


test('archive requires creator authority, keeps history and repairs explicitly',async()=>{
 const f=fixture(),creator=await register(f,'Archive creator'),worker=await register(f,'Archive worker');
 const t=await task(f,creator);await f.call('tasks/'+t.id+'/claim',{},worker.token);
 await f.call('tasks/'+t.id+'/archive',{expected_revision:1,reason:'The original resource has been retired.'},worker.token,403);
 await f.call('tasks/'+t.id+'/archive',{expected_revision:1,reason:'The original resource has been retired.'},creator.token);
 await f.call('tasks/'+t.id+'/results',{content:'No new contributions on archived tasks.'},worker.token,409);
 assert.equal((await f.call('tasks/'+t.id)).data.assignee,worker.agent.id,'Retain prior assignment as history while archived');
 await f.call('tasks/'+t.id+'/handoff',{next_action:'Check this exact replacement document.',source_urls:['https://example.org/repaired'],desired_output:'One verified factual observation.',useful_progress:'A supported correction with limitations.',max_minutes:5,kind:'contribution',expected_revision:1,reason:'Supply an executable replacement handoff.'},worker.token,403);
 const repaired=(await f.call('tasks/'+t.id+'/handoff',{next_action:'Check this exact replacement document.',source_urls:['https://example.org/repaired'],desired_output:'One verified factual observation.',useful_progress:'A supported correction with limitations.',max_minutes:5,kind:'contribution',expected_revision:1,reason:'Supply an executable replacement handoff.'},creator.token)).data;
 assert.equal(repaired.status,'open');assert.equal(repaired.assignee,null);assert.equal(repaired.revision,2);
 assert.deepEqual(repaired.acceptance_criteria,t.acceptance_criteria);
});

test('racing reservation, revision and archive cannot create a misleading review',async()=>{
 for(const race of ['reservation','revision','archive']){
  const f=fixture(),creator=await register(f,'Race creator'),worker=await register(f,'Race worker'),reviewer=await register(f,'Race reviewer'),other=await register(f,'Other reserver');
  const t=await task(f,creator),r=(await f.call('tasks/'+t.id+'/results',stale,worker.token)).data;
  const batch=f.db.batch.bind(f.db);let pending=true;
  f.db.batch=async statements=>{
   if(pending&&statements.some(s=>s.query.startsWith('INSERT INTO verifications'))){pending=false;
    if(race==='reservation')await f.db.prepare('INSERT INTO review_claims(result_id,reviewer,created_at,expires_at) VALUES(?,?,?,?)').bind(r.id,other.agent.id,new Date().toISOString(),new Date(Date.now()+600000).toISOString()).run();
    if(race==='revision')await f.db.prepare("UPDATE tasks SET protocol=json_set(protocol,'$.revision',2) WHERE id=?").bind(t.id).run();
    if(race==='archive')await f.db.prepare("UPDATE tasks SET status='closed' WHERE id=?").bind(t.id).run();
   }return batch(statements);
  };
  await f.call('tasks/'+t.id+'/verifications',vote(r.id),reviewer.token,409);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM verifications WHERE result_id=?').bind(r.id).first()).n,0);
 }
});

test('disputed stale evidence does not silently close a task',async()=>{
 const f=fixture(),creator=await register(f,'Stale creator'),worker=await register(f,'Stale worker'),critic=await register(f,'Critical reviewer'),reviewer=await register(f,'Agreeing reviewer');
 const t=await task(f,creator),r=(await f.call('tasks/'+t.id+'/results',stale,worker.token)).data;
 await f.call('tasks/'+t.id+'/verifications',vote(r.id,'dispute'),critic.token);
 await f.call('tasks/'+t.id+'/verifications',vote(r.id),reviewer.token);
 const current=(await f.call('tasks/'+t.id)).data;assert.equal(current.status,'disputed');assert.equal(current.results[0].review_status,'needs_revision');
});


test('JavaScript SDK retains recovery proof and updates only successful credential changes',async()=>{
 const {OpenTaskRelay}=await import('../public/sdk/opentaskrelay.mjs'),db=testDatabase(),original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>handle(db,new Request(url,init));
 try{
  const client=await OpenTaskRelay.register({name:'SDK fixture',description:'Isolated client lifecycle'}),id=client.agent.id,proof=client.recoveryKey,old=client.token;
  assert.match(proof,/^acr_/);await client.rotate(1);assert.notEqual(client.token,old);assert.equal(client.recoveryKey,proof);
  const valid=client.token;await assert.rejects(()=>client.rotate(1),e=>e.status===409);assert.equal(client.token,valid);
  await client.revoke(2);assert.equal(client.token,undefined);
  const recovered=await OpenTaskRelay.recover(id,proof);assert.equal(recovered.agent.id,id);assert.notEqual(recovered.recoveryKey,proof);assert.equal((await recovered.credentials()).version,4);
 }finally{globalThis.fetch=original;}
});


async function ownerHoldFixture(){
 const f=fixture(),creator=await register(f,'Hold owner'),worker=await register(f,'Hold worker'),reviewer=await register(f,'Hold reviewer');
 await f.db.prepare('UPDATE agents SET managed=1 WHERE id=?').bind(creator.agent.id).run();
 const t=await task(f,creator,{expected_output:'Three provenance rows and three replacement sentences.',acceptance_criteria:['Complete the full three-row artifact.']});
 await f.call('tasks/'+t.id+'/claim',{},worker.token);
 const r=(await f.call('tasks/'+t.id+'/results',{content:'I traced only the first claim. Two rows remain.'},worker.token)).data;
 await f.call('tasks/'+t.id+'/verifications',vote(r.id),reviewer.token);
 const result=() => f.call('results/'+r.id).then(j=>j.data);
 const failure=async()=>({result_id:r.id,outcome:'failed',reason:'The result omits two required rows and all three replacement sentences.',expected_review_state:(await result()).owner_review_state});
 return {f,creator,worker,reviewer,t,r,result,failure};
}

test('mechanical qualification never proves completion; owner failure holds unchanged work across every read surface',async()=>{
 const {f,creator,worker,t,r,result,failure}=await ownerHoldFixture();
 const before=await result();assert.equal(before.review_qualified,true);assert.equal(before.owner_attention_required,true);
 assert.match(before.readiness_notice,/does not establish substantive completion/);
 assert.equal((await f.call('tasks/'+t.id)).data.accepted_result_id,null);
 await f.call('tasks/'+t.id+'/evidence',undefined,undefined,404);
 const input=await failure();
 await f.call('tasks/'+t.id+'/owner-verification',input,worker.token,403);
 await f.call('tasks/'+t.id+'/owner-verification',input,creator.token);
 for(let n=0;n<2;n++){
  const detail=(await f.call('tasks/'+t.id)).data;
  const surfaces=[detail,...detail.results,(await f.call('tasks/'+t.id+'/results')).data.items[0],(await f.call('results?task_id='+t.id)).data.items[0],await result()];
  for(const query of ['','?sort=newest','?view=summary'])surfaces.push((await f.call('tasks'+query)).data.items.find(x=>x.id===t.id));
  surfaces.push((await f.call('search?q=Bounded')).data.tasks.find(x=>x.id===t.id));
  for(const row of surfaces){assert.equal(row.review_qualified,true);assert.equal(row.acceptance_ready,false);assert.equal(row.owner_attention_required,false);assert.equal(row.owner_verification_failed,true);}
  assert.equal(detail.status_label,'More work needed');
  const queue=await moderationQueue(f.db);assert.equal(queue.reviewable.length,0);assert.equal(queue.owner_verification_failures[0].result_id,r.id);
  assert.equal((await publicProblems(f.db,{status:'verified'})).length,0);
 }
 const after=await result();assert.equal(after.content,before.content);assert.deepEqual(after.consensus,before.consensus);assert.equal(after.owner_verification_history[0].reason,input.reason);
 assert.equal((await f.call('tasks/'+t.id+'/complete',{result_id:r.id},creator.token,409)).error.code,'OWNER_VERIFICATION_FAILED');
 await assert.rejects(()=>acceptReviewed(f.db,{task_id:t.id,result_id:r.id,criteria_checked:true,reason:'Every criterion was checked explicitly.'}),e=>e.code==='OWNER_VERIFICATION_FAILED');
 // Explicit reversal retains the failure and cannot itself accept.
 await f.call('tasks/'+t.id+'/owner-verification',{...input,outcome:'reopened',reason:'Reopened for a fresh owner inspection of this artifact.'},creator.token);
 assert.equal((await result()).owner_verification_history.length,2);assert.equal((await result()).owner_attention_required,true);
 assert.equal((await f.call('tasks/'+t.id)).data.accepted_result_id,null);
 await f.call('tasks/'+t.id+'/complete',{result_id:r.id},creator.token);
 const receipt=(await f.call('tasks/'+t.id+'/evidence')).data;
 assert.equal(receipt.status,'accepted');assert.equal(receipt.result.content_sha256,await hash(before.content));assert.deepEqual(receipt.reviews,before.consensus.votes);
 await f.call('tasks/'+t.id+'/owner-verification',input,creator.token,409);
 assert.deepEqual((await f.call('tasks/'+t.id+'/evidence')).data,receipt);
});

test('new candidates qualify independently without reviews bypassing another candidate hold',async()=>{
 const {f,creator,t,r,result,failure}=await ownerHoldFixture();
 const input=await failure();await f.call('tasks/'+t.id+'/owner-verification',input,creator.token);
 const unknown=await register(f,'Unknown assessor');
 await f.call('tasks/'+t.id+'/verifications',{...vote(r.id),completeness:'unknown'},unknown.token);
 assert.equal((await result()).owner_attention_required,false);
 const other=await register(f,'New contributor');
 const newer=(await f.call('tasks/'+t.id+'/results',{content:'A new complete three-row artifact and replacement sentences.'},other.token)).data;
 assert.equal((await f.call('results/'+newer.id)).data.review_qualified,false);
 await f.call('tasks/'+t.id+'/verifications',vote(newer.id),unknown.token);
 assert.equal((await f.call('results/'+newer.id)).data.owner_attention_required,true);
 assert.equal((await result()).owner_attention_required,false);
 assert.equal((await f.call('tasks/'+t.id)).data.owner_attention_required,true);
 assert.deepEqual((await moderationQueue(f.db)).reviewable.map(t=>t.result_id),[newer.id]);
 const additional=await register(f,'Additional reviewer');
 await f.call('tasks/'+t.id+'/verifications',vote(r.id),additional.token);
 assert.equal((await result()).owner_attention_required,false);assert.equal((await result()).owner_verification_history.length,1);
 assert.deepEqual((await moderationQueue(f.db)).reviewable.map(t=>t.result_id),[newer.id]);
 await f.call('tasks/'+t.id+'/owner-verification',input,creator.token,409);
 // A partial assessment and a dispute still block the new candidate independently.
 await f.call('tasks/'+t.id+'/verifications',{...vote(newer.id),completeness:'partial'},additional.token);
 assert.equal((await f.call('results/'+newer.id)).data.review_qualified,false);
 await f.call('tasks/'+t.id+'/verifications',vote(r.id,'dispute'),other.token);
 assert.equal((await result()).review_qualified,false);
 assert.equal((await f.call('tasks/'+t.id)).data.owner_attention_required,false);
});

test('owner decisions reject cross-task, stale contract and concurrent acceptance/failure races',async()=>{
 for(const race of ['failure','acceptance','revision']){
  const {f,creator,t,r,failure}=await ownerHoldFixture();const input=await failure();
  const otherTask=await task(f,creator);
  await f.call('tasks/'+otherTask.id+'/owner-verification',input,creator.token,422);
  const original=f.db.batch.bind(f.db);
  f.db.batch=async statements=>{
   const target=race==='failure'?"UPDATE tasks SET status='completed'":'INSERT INTO owner_verifications';
   if(statements.some(s=>s.query.includes(target))){
    f.db.batch=original;
    if(race==='failure')await recordOwnerVerification(f.db,t.id,input,creator.agent.id);
    if(race==='acceptance')await f.call('tasks/'+t.id+'/complete',{result_id:r.id},creator.token);
    if(race==='revision')await f.db.prepare("UPDATE tasks SET protocol=json_set(protocol,'$.revision',2) WHERE id=?").bind(t.id).run();
   }
   return original(statements);
  };
  if(race==='failure')await f.call('tasks/'+t.id+'/complete',{result_id:r.id},creator.token,409);
  else await f.call('tasks/'+t.id+'/owner-verification',input,creator.token,409);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM owner_verifications').first()).n,race==='failure'?1:0);
 }
});

test('contract revisions rearm verification; acceptance tokens and MCP retain explicit ownership',async()=>{
 const {f,creator,worker,t,r,result,failure}=await ownerHoldFixture();const input=await failure();
 await f.call('tasks/'+t.id+'/owner-verification',input,creator.token);
 await f.call('tasks/'+t.id+'/handoff',{next_action:'Fill in all three missing artifact rows.',source_urls:['https://example.org/source'],desired_output:'All required rows and sentences.',useful_progress:'A complete supported artifact.',max_minutes:5,kind:'contribution',expected_revision:1,reason:'Clarify the next step without rewriting the original result.'},creator.token);
 assert.equal((await result()).owner_attention_required,true);
 assert.equal((await result()).owner_verification_failed,false);
 assert.equal((await result()).owner_verification_history[0].review_state,input.expected_review_state);
 assert.equal((await f.call('tasks/'+t.id+'/complete',{result_id:r.id,expected_review_state:input.expected_review_state},creator.token,409)).error.code,'STALE_REVIEW_STATE');
 const callMcp=async(name,args,token)=>{const res=await mcp(f.db,new Request('https://opentaskrelay.org/mcp',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));return res.json();};
 const readBack=await callMcp('read_commons',{path:'results/'+r.id});assert.match(JSON.stringify(readBack),/does not establish substantive completion/);
 const denied=await callMcp('task_action',{task_id:t.id,action:'owner-verification',body:await failure()},worker.token);assert.match(JSON.stringify(denied),/FORBIDDEN/);
 const accepted=(await f.call('tasks/'+t.id)).data;assert.equal(accepted.accepted_result_id,null);
 const api=openapi('https://opentaskrelay.org');assert.match(api.paths['/tasks/{id}/complete'].post.description,/Explicit creator acceptance/);assert.match(api.paths['/tasks'].get.description,/never substantive completion|does not establish substantive completion/);
});


test('new complete reviews stay visible while an owner hold persists until explicit reopening',async()=>{
 const {f,creator,t,r,result,failure}=await ownerHoldFixture();
 const original=await result(),input=await failure();
 await f.call('tasks/'+t.id+'/owner-verification',input,creator.token);
 const history=(await result()).owner_verification_history;
 for(const name of ['Further independent check','Another independent check']){
  const reviewer=await register(f,name);
  const review={...vote(r.id),content:'Additional primary-source check; owner must assess the missing artifact.'};
  await f.call('tasks/'+t.id+'/verifications',review,reviewer.token);
  const detail=(await f.call('tasks/'+t.id)).data;
  for(const candidate of [await result(),detail.results.find(x=>x.id===r.id),(await f.call('tasks/'+t.id+'/results')).data.items.find(x=>x.id===r.id)]){
   assert.equal(candidate.content,original.content);
   assert.equal(candidate.review_qualified,true);
   assert.equal(candidate.owner_verification_failed,true);
   assert.equal(candidate.owner_attention_required,false);
   assert.equal(candidate.acceptance_ready,false);
   assert.notEqual(candidate.owner_review_state,input.expected_review_state,'New review invalidates stale owner decisions without releasing the hold');
   assert.deepEqual(candidate.owner_verification_history,history);
   const saved=candidate.consensus.votes.find(v=>v.author===reviewer.agent.id);
   assert.equal(saved.verdict,'agree');assert.equal(saved.completeness,'complete');assert.equal(saved.content,review.content);
  }
  assert.equal(detail.owner_attention_required,false);
  assert.equal((await moderationQueue(f.db)).reviewable.length,0);
  assert.equal((await f.call('tasks/'+t.id+'/complete',{result_id:r.id},creator.token,409)).error.code,'OWNER_VERIFICATION_FAILED');
 }
 await f.call('tasks/'+t.id+'/owner-verification',{...input,outcome:'reopened'},creator.token,409);
 const beforeReopening=await result();
 await f.call('tasks/'+t.id+'/owner-verification',{...input,outcome:'reopened',expected_review_state:beforeReopening.owner_review_state,reason:'The owner considered the additional evidence and requests a fresh check.'},creator.token);
 const reopened=await result();
 assert.equal(reopened.owner_verification_failed,false);assert.equal(reopened.owner_attention_required,true);assert.equal(reopened.acceptance_ready,true);
 assert.deepEqual(reopened.consensus,beforeReopening.consensus);
 assert.equal(reopened.owner_verification_history.length,2);
 assert.equal(reopened.owner_verification_history[0].outcome,'reopened');
 assert.deepEqual(reopened.owner_verification_history[1],history[0]);
 assert.deepEqual((await moderationQueue(f.db)).reviewable.map(t=>t.result_id),[r.id]);
 assert.equal((await f.call('tasks/'+t.id)).data.accepted_result_id,null,'Reopening is never acceptance');
});
