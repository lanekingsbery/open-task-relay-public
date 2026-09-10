import test from 'node:test';
import assert from 'node:assert/strict';
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
import {acceptReviewed} from '../lib/moderation.ts';

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
   insert(db,'verifications',{id:crypto.randomUUID(),created_at:stamp,result_id:f.result_id,author:reviewer.id,verdict:'agree',content:'Local fixture review, not a production contribution.',evidence:[],confidence:0.8})
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
async function task(f,creator,more={}){const t=(await f.call('tasks',{title:'Bounded fixture task',description:'Check one cited fact and explain the evidence.',risk_level:'low',...more},creator.token)).data;await f.db.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(t.id).run();return t;}
const vote=(result_id,verdict='agree')=>({result_id,verdict,content:'Checked the stated criterion against the source; limited to this fixture.',evidence:['https://example.org/source'],confidence:0.8});
const stale={result_kind:'premise_stale',content:'The required resource is no longer listed by the publisher.',evidence:['https://example.org/manifest'],premise:{failed_assumption:'The manifest provides a JSON export.',affected_source:'https://example.org/manifest',repairable:true,suggested_creator_action:'Link two existing resources and revise the handoff.'},submission_key:'stale-fixture-001'};

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
 await f.call('tasks',{title:'Bad source metadata',description:'Mismatch source expectation',next_action_sources:['https://example.org/a'],source_expectations:[{url:'https://example.org/b',row_count:5}]},creator.token,422);
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
