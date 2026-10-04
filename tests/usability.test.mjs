import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {register,insert,read,handle,write,one} from '../lib/commons.ts';
import {createTaskFixture} from './task-fixture.mjs';
import {publicProblems} from '../lib/public-work.ts';
import {reviewQueue,completionPayoff} from '../lib/reviews.ts';
import {relayLeg} from '../lib/relay.ts';
import {taskPreview} from '../lib/task-display.ts';
import {acceptReviewed,resolveReport,moderationQueue} from '../lib/moderation.ts';
import {recordOwnerVerification} from '../lib/owner-verification.ts';
function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
 return {sql,prepare(s){const stmt=sql.prepare(s);let args=[];return {bind(...v){args=v;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return stmt.run(...args)}}},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
}
async function fixture(){
 const db=database(),agents=[];
 for(const name of ['Curator','Producer','Prior reviewer','Fresh reviewer'])agents.push((await register(db,{name,description:'Synthetic local usability test',operator:name},name)).agent);
 const [curator,producer,prior,fresh]=agents;await db.prepare('UPDATE agents SET managed=1 WHERE id=?').bind(curator.id).run();
 const task=await createTaskFixture(db,{title:'Synthetic dated comparison',description:'Compare only the two dated inline definitions.',objective:'Return both definitions and a limitation.',acceptance_criteria:['Include both dated definitions.','Include a limitation.'],risk_level:'low',required_capabilities:['usability-fixture'],next_action:'Check the finished comparison against every task requirement.',next_action_kind:'review'},{...curator,managed:1});
 await db.prepare("UPDATE tasks SET moderation_status='approved',status='verified' WHERE id=?").bind(task.id).run();
 const result=crypto.randomUUID(),review=crypto.randomUUID();
 await insert(db,'results',{id:result,created_at:'2026-01-01',task_id:task.id,author:producer.id,content:'Definition A (dated) and definition B (dated); limitation: coverage unknown.',evidence:['https://example.org/definitions'],result_kind:'contribution'}).run();
 await insert(db,'verifications',{id:review,created_at:'2026-01-02',result_id:result,author:prior.id,verdict:'agree',completeness:'unknown',content:'Definitions agree; full completion not assessed.',evidence:[],confidence:0.8}).run();
 return {db,task,result,review,curator,producer,prior,fresh};
}
test('normal discovery prioritizes exact completion checks, honors explicit filters and leaves acceptance pending',async()=>{
 const f=await fixture(),{db,task,result,fresh}=f;
 const open=await createTaskFixture(db,{title:'Featured open alternative',description:'An unrelated open fixture.',risk_level:'low',required_capabilities:['usability-fixture']},f.curator);
 await db.prepare("UPDATE tasks SET moderation_status='approved',launch_mission=1 WHERE id=?").bind(open.id).run();
 const queue=await reviewQueue(db);assert.equal(queue.kind,'all');assert.equal(queue.items[0].result_id,result);assert.equal(queue.items[0].kind,'completion');
 assert.deepEqual(queue.items[0].requirements.acceptance_criteria,task.acceptance_criteria);assert.equal(queue.items[0].payoff,completionPayoff);assert.equal(queue.items[0].review_action.result_id,result);assert.equal(queue.items[0].claim_endpoint,undefined);assert.deepEqual(queue.items[0].prior_reviewer_ids,[f.prior.id]);
 const get=async(query)=>{const response=await handle(db,new Request('https://commons.test/api/tasks?'+new URLSearchParams({capability:'usability-fixture',...query})));assert.equal(response.status,200,await response.clone().text());return (await response.json()).data.items;};
 assert.equal((await get({view:'summary'}))[0].id,task.id);assert.equal((await get({view:'summary'}))[0].relay_leg.review_action.result_id,result);
 assert.equal((await publicProblems(db,{capability:'usability-fixture',sort:'best'}))[0].id,task.id);
 assert.deepEqual((await get({ready:'true'})).map(t=>t.id),[open.id]);assert.deepEqual((await get({status:'open'})).map(t=>t.id),[open.id]);assert.deepEqual((await get({capability:'no-match'})),[]);
 assert.equal((await reviewQueue(db,20,0,task.id,'first')).items.length,0);
 const detail=await read(db,['tasks',task.id],new URLSearchParams());assert.equal(detail.relay_leg.related_result_id,result);assert.equal(detail.relay_leg.payoff,completionPayoff);
 await assert.rejects(()=>write(db,['tasks',task.id,'verifications'],{result_id:result,verdict:'agree',completeness:'complete',content:'Self review is prohibited.',evidence:[],confidence:0.9},f.producer),e=>e.code==='NOT_INDEPENDENT');
 await write(db,['tasks',task.id,'verifications'],{result_id:result,verdict:'agree',completeness:'complete',content:'Compared both definitions, dates and the disclosed limitation with every criterion.',evidence:['https://example.org/definitions'],confidence:0.9},fresh);
 const after=await read(db,['tasks',task.id],new URLSearchParams());assert.equal(after.completion_review_needed,false);assert.equal(after.accepted_result_id,null);assert.equal(after.owner_attention_required,true);assert.equal((await reviewQueue(db,20,0,task.id)).items.length,0);
});
test('active claims, research handoffs, partial reviews, disputes and moderation holds suppress completion advertising',async()=>{
 for(const state of ['task-claim','review-claim','research','partial','dispute','hold','expired','subtask','recorded-gap']){
  const f=await fixture(),{db,task,result}=f;
  if(state==='task-claim')await db.prepare("UPDATE tasks SET status='claimed',claim_expires_at='2099-01-01',assignee=? WHERE id=?").bind(f.producer.id,task.id).run();
  if(state==='review-claim')await db.prepare("INSERT INTO review_claims(result_id,reviewer,created_at,expires_at) VALUES (?,?,'2026-01-01','2099-01-01')").bind(result,f.fresh.id).run();
  if(state==='research')await db.prepare("UPDATE tasks SET protocol=json_set(protocol,'$.next_action_kind','contribution','$.next_action_result_id',?,'$.next_action','Compare the missing dated visitor notice and return one cited access row.') WHERE id=?").bind(result,task.id).run();
  if(['partial','dispute'].includes(state))await db.prepare('UPDATE verifications SET completeness=?,verdict=? WHERE id=?').bind(state==='partial'?'partial':'unknown',state==='dispute'?'dispute':'agree',f.review).run();
  if(state==='hold')await recordOwnerVerification(db,task.id,{result_id:result,outcome:'failed',reason:'The second required definition is not substantiated.',expected_review_state:(await read(db,['results',result],new URLSearchParams())).owner_review_state},null);
  if(state==='recorded-gap')await db.prepare("INSERT INTO relay_finishing(state_key,task_id,created_at,status,source_version,source_result_ids,candidate_id,decision_json) VALUES ('gap',?,1,'complete','synthetic','[]',?,?)").bind(task.id,result,JSON.stringify({outcome:'candidate',missing:['A separate dated visitor notice still needs comparison.'],next_action:'Compare the missing dated visitor notice and return a cited row.'})).run();
  if(state==='expired')await db.prepare("UPDATE tasks SET protocol=json_set(protocol,'$.expires_at','2020-01-01') WHERE id=?").bind(task.id).run();
  if(state==='subtask'){const child=await createTaskFixture(db,{title:'Unfinished child',description:'Local only.'},f.curator);await db.prepare('UPDATE tasks SET parent_id=? WHERE id=?').bind(task.id,child.id).run();}
  assert.equal((await reviewQueue(db,20,0,task.id,'completion')).items.length,0,state);
  const detail=await read(db,['tasks',task.id],new URLSearchParams());assert.equal(detail.completion_review_needed,false,state);
  if(['research','recorded-gap'].includes(state)){assert.match(detail.relay_leg.next_action,/missing dated visitor notice/);assert.match(taskPreview({...detail,latest_result_id:result}).next,/missing dated visitor notice/);assert.equal(detail.relay_leg.payoff,undefined);
   const withAttention={...detail,latest_result_id:result,owner_attention_required:true};assert.match(relayLeg(withAttention).next_action,/missing dated visitor notice/);assert.match(taskPreview(withAttention).next,/missing dated visitor notice/);
   if(state==='recorded-gap'){await db.prepare("INSERT INTO relay_finishing(state_key,task_id,created_at,status,source_version,source_result_ids,candidate_id,decision_json) VALUES ('gap-resolved',?,2,'complete','synthetic','[]',?,?)").bind(task.id,result,JSON.stringify({outcome:'ready_for_owner_check',missing:[],next_action:'Compare every completion criterion with the candidate.'})).run();assert.equal((await read(db,['tasks',task.id],new URLSearchParams())).completion_review_needed,true,'A newer finishing assessment supersedes its earlier gap advice');}
  }
 }
 // Even stale caller data must not overwrite a specific current research handoff.
 const leg=relayLeg({id:'local',latest_result_id:'candidate',completion_review_needed:true,next_action_kind:'contribution',next_action_result_id:'candidate',next_action:'Compare the missing visitor notice and record its date.'});assert.equal(leg.kind,'contribution');assert.equal(leg.payoff,undefined);
});
test('accept/request changes/reopen preserve recorded evidence, holds and explicit audit judgments',async()=>{
 const f=await fixture(),{db,task,result}=f;
 const original=await one(db,'SELECT content FROM results WHERE id=?',result),reviewBefore=await one(db,'SELECT * FROM verifications WHERE id=?',f.review);
 const state=(await read(db,['results',result],new URLSearchParams())).owner_review_state;
 const decision={task_id:task.id,result_id:result,reason:'Both dated definitions and the disclosed limitation satisfy the stated requirements.',criteria_checked:true,review_basis:'Accepted against both criteria, citing the recorded independent check.',review_ids:[f.review],expected_review_state:state};
 await recordOwnerVerification(db,task.id,{result_id:result,outcome:'failed',reason:'The second dated definition needs more evidence.',expected_review_state:state},null);
 await assert.rejects(()=>acceptReviewed(db,decision),e=>e.code==='OWNER_VERIFICATION_FAILED');
 await recordOwnerVerification(db,task.id,{result_id:result,outcome:'reopened',reason:'The recorded evidence now supports a fresh acceptance check.',expected_review_state:state},null);
 await assert.rejects(()=>acceptReviewed(db,{...decision,review_ids:[crypto.randomUUID()]}),e=>e.code==='UNVERIFIED');
 const accepted=await acceptReviewed(db,decision);assert.equal(accepted.accepted_result_id,result);assert.equal(accepted.status,'completed');
 assert.deepEqual(await one(db,'SELECT content FROM results WHERE id=?',result),original);assert.deepEqual(await one(db,'SELECT * FROM verifications WHERE id=?',f.review),reviewBefore);
 assert.equal((await one(db,'SELECT count(*) n FROM owner_verifications WHERE result_id=?',result)).n,2);assert.equal((await one(db,'SELECT count(*) n FROM task_conclusions WHERE result_id=?',result)).n,0,'No judgment is prefilled');
 assert.deepEqual((await one(db,'SELECT review_ids FROM owner_completion_checks WHERE result_id=?',result)).review_ids,[f.review]);
});
test('finishing handoffs preserve legacy source checks and distinguish typed review work without changing acceptance',async()=>{
 for(const kind of [undefined,'contribution','review']){
  const f=await fixture(),{db,task,result}=f,next='Read the dated visitor-access notice and return one cited access row.';
  await db.prepare("INSERT INTO relay_finishing(state_key,task_id,created_at,status,source_version,source_result_ids,candidate_id,decision_json) VALUES ('legacy-source-check',?,1,'complete','synthetic','[]',?,?)").bind(task.id,result,JSON.stringify({owner_ready:false,outcome:'candidate',missing:[],next_action:next,...(kind?{next_action_kind:kind}:{})})).run();
  const detail=await read(db,['tasks',task.id],new URLSearchParams()),review=kind==='review';
  assert.equal(detail.completion_review_needed,review);assert.equal(detail.finishing_work_needed,!review);
  assert.equal((await reviewQueue(db,20,0,task.id)).items.length,review?1:0);
  assert.equal(detail.accepted_result_id,null);assert.equal(Boolean(detail.owner_check_ready),false);
  if(!review){assert.equal(detail.relay_leg.next_action,next);assert.equal(detail.relay_leg.kind,'contribution');assert.equal(detail.relay_leg.desired_output,next);assert.equal(detail.relay_leg.payoff,undefined);assert.equal(taskPreview({...detail,latest_result_id:result}).next,next);}
  else{assert.equal(detail.relay_leg.review_action.result_id,result);assert.equal(detail.relay_leg.payoff,completionPayoff);}
 }
});
test('report resolution retains original content and private reasons without changing content visibility',async()=>{
 const f=await fixture(),{db}=f,report=crypto.randomUUID(),reason='Private resolution reason SENTINEL.';
 await insert(db,'reports',{id:report,created_at:'2026-01-01',author:f.producer.id,entity_type:'tasks',entity_id:f.task.id,reason:'Original reported concern.'}).run();
 await insert(db,'events',{id:crypto.randomUUID(),created_at:'2026-01-01',actor:f.producer.id,action:'created',entity_type:'reports',entity_id:report,summary:'Original public report event.'}).run();
 assert.equal((await moderationQueue(db)).reports.length,1);await resolveReport(db,{report_id:report,reason});assert.equal((await moderationQueue(db)).reports.length,0);
 assert.equal((await moderationQueue(db)).resolved_reports[0].resolution_reason,reason);assert.equal((await one(db,'SELECT reason FROM reports WHERE id=?',report)).reason,'Original reported concern.');assert.equal((await one(db,'SELECT moderation_status FROM tasks WHERE id=?',f.task.id)).moderation_status,'approved');
 const feed=JSON.stringify(await read(db,['feed'],new URLSearchParams()));assert.ok(!feed.includes('SENTINEL'));assert.ok(feed.includes('Original public report event.'));
 await resolveReport(db,{report_id:report,reason:'A duplicate retry must preserve the first record.'});assert.equal((await one(db,"SELECT count(*) n FROM events WHERE entity_type='reports' AND entity_id=? AND action='report resolved'",report)).n,1);
});
