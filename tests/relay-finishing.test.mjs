import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {finishingState,finishWorkedTask,runScheduledFinishing} from '../lib/relay-finishing.ts';
import {acceptReviewed} from '../lib/moderation.ts';
import {read,hash} from '../lib/commons.ts';
import {acceptedContributors} from '../lib/accepted-contributors.ts';
import {acceptedGallery} from '../lib/accepted-gallery.ts';
import {trophies} from '../lib/public-work.ts';
import {contributionReceipt} from '../lib/contribution-receipt.ts';
import {publicActivity} from '../lib/activity.ts';
import {evidenceBundle} from '../lib/evidence-bundle.ts';
import {updateHandoff} from '../lib/task-edit.ts';
import {reserveChat} from '../lib/relay-chat-store.ts';
import {CHAT_TARIFF,CHAT_LIMITS} from '../lib/relay-chat-policy.ts';
const source='a'.repeat(40),stamp='2026-09-01T00:00:00.000Z';
async function fixture(t){
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("local")}}',compatibilityDate:'2026-09-07',d1Databases:['DB'],outboundService(){throw Error('No network')}}));t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
 const owner=crypto.randomUUID(),author=crypto.randomUUID(),reviewer=crypto.randomUUID(),task=crypto.randomUUID(),result=crypto.randomUUID(),vote=crypto.randomUUID();
 for(const [id,name,managed,operator] of [[owner,'Curator',1,'site'],[author,'Contributor',0,'contributor'],[reviewer,'Reviewer',0,'outside'],['346e9e0d-e81c-491d-9757-6d1f100249a2','Relay',1,'site']])await db.prepare("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen,managed,operator) VALUES (?,?,?,'fixture','[]','[]',?,?,?,?)").bind(id,stamp,name,await hash(id),stamp,managed,operator).run();
 const protocol={revision:1,objective:'An original field note',expected_output:'Two dated findings and a limitations note.',acceptance_criteria:['Two dated findings and a limitations note.'],expires_at:'2026-01-01T00:00:00.000Z'};
 await db.prepare("INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status,assignee) VALUES (?,?,?,?,'Synthetic work','Two findings','[]',?,'verified','approved',?)").bind(task,stamp,stamp,owner,JSON.stringify(protocol),author).run();
 await db.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,result_kind,contract_revision) VALUES (?,?,?,?,'Two dated findings with one minor count error.','[]','contribution',1)").bind(result,stamp,task,author).run();
 await db.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,completeness,content,evidence,confidence) VALUES (?,?,?,?,'agree','partial','Both findings checked. Count should be 11.','[]',0.9)").bind(vote,stamp,result,reviewer).run();
 await db.prepare('UPDATE relay_chat_control SET enabled=1,tariff=?,reviewed_until=?').bind(CHAT_TARIFF,Date.now()+7*86400000).run();
 return {db,task,result,vote,author,reviewer};
}
const decision=(f,patch={})=>({owner_ready:true,outcome:'candidate',summary:'Relay assembled the two dated findings and corrected the documented count.',missing:[],optional:['A larger sample could be checked separately.'],next_action:'Inspect this finished candidate against the requirements before the moderation check.',candidate:'Two dated findings, recorded September 1. Corrected vocabulary count: 11. Limitations: these are dated observations.',source_result_ids:[f.result],corrections:[{change:'Replaced the count with 11.',support:'Count should be 11.',review_id:f.vote}],...patch});
const rows=async(db,table)=>(await db.prepare('SELECT * FROM '+table).all()).results;

test('required research keeps its specific contribution handoff and output',async t=>{
 for(const missing of [['A separate dated visitor notice comparison.'],[]]){
 const f=await fixture(t),next='Compare the missing dated visitor notice and return a cited access row.';
 await finishWorkedTask(f.db,await finishingState(f.db,f.task),decision(f,{owner_ready:false,outcome:'further_work',candidate:null,corrections:[],missing,next_action:next}),source);
 const task=await read(f.db,['tasks',f.task],new URLSearchParams());
 assert.equal(task.next_action_kind,'contribution');assert.equal(task.next_action_result_id,f.result);assert.equal(task.next_action_output,missing[0]||next);
 assert.equal(task.relay_leg.kind,'contribution');assert.equal(task.relay_leg.next_action,next);assert.equal(task.completion_review_needed,false);assert.equal(task.relay_leg.payoff,undefined);
 }
});

test('finishing records the action kind and preserves untyped legacy candidate follow-ups',async t=>{
 for(const kind of [undefined,'contribution','review']){
  const f=await fixture(t),next='Read the dated source notice and return one cited access row.';
  const out=await finishWorkedTask(f.db,await finishingState(f.db,f.task),decision(f,{owner_ready:false,next_action:next,...(kind?{next_action_kind:kind}:{})}),source);
  const task=await read(f.db,['tasks',f.task],new URLSearchParams());
  assert.equal(task.next_action_kind,kind==='review'?'review':'contribution');assert.equal(task.next_action,next);
  if(kind!=='review')assert.equal(task.next_action_output,next);
  assert.equal(task.accepted_result_id,null);assert.equal(out.code,'FINISHED');
 }
});
test('assembly preserves originals, reviews, credit, and holds; own writes cannot trigger another candidate',async t=>{
 const f=await fixture(t),{db}=f;
 await db.prepare("INSERT INTO owner_verifications(created_at,result_id,review_state,actor,outcome,reason) VALUES (?,?,?,'site_owner','failed','Correct the documentation count.')").bind(stamp,f.result,'[1,[]]').run();
 const original=await rows(db,'results'),votes=await rows(db,'verifications'),holds=await rows(db,'owner_verifications');
 const s=await finishingState(db,f.task),out=await finishWorkedTask(db,s,decision(f),source);
 assert.equal(out.code,'FINISHED');assert.equal((await finishingState(db,f.task)).state_key,s.state_key);
 assert.deepEqual((await rows(db,'results')).filter(r=>r.id===f.result),original);assert.deepEqual(await rows(db,'verifications'),votes);assert.deepEqual(await rows(db,'owner_verifications'),holds);
 const r=(await rows(db,'results')).find(r=>r.id===out.candidate_id);assert.match(r.content,/Assembled by Relay from:\nContributor — \/tasks\//);assert.match(r.content,new RegExp(f.result));assert.equal(r.author,'346e9e0d-e81c-491d-9757-6d1f100249a2');
 assert.equal((await rows(db,'tasks'))[0].accepted_result_id,null);
 const result=await read(db,['results',r.id],new URLSearchParams());assert.equal(result.consensus.independent_checks,0);assert.equal(result.review_qualified,false);assert.equal(result.owner_attention_required,true);
 assert.equal((await finishWorkedTask(db,s,decision(f),source)).code,'REPLAYED');assert.equal((await rows(db,'results')).length,2);
});

test('normal owner acceptance cites component checks without cloning votes or pretending Relay has a review',async t=>{
 const f=await fixture(t),{db}=f,out=await finishWorkedTask(db,await finishingState(db,f.task),decision(f),source);
 await assert.rejects(acceptReviewed(db,{task_id:f.task,result_id:out.candidate_id,reason:'Checked this completed artifact.',criteria_checked:true}));
 const accepted=await acceptReviewed(db,{task_id:f.task,result_id:out.candidate_id,reason:'The requested dated note is complete after the documented correction.',criteria_checked:true,review_basis:'The independent reviewer checked both findings and supplied the exact count correction. Relay changed no other claim.',review_ids:[f.vote]});
 assert.equal(accepted.status,'completed');assert.equal((await rows(db,'verifications')).length,1);
 const bundle=await evidenceBundle(db,f.task);assert.equal(bundle.status,'accepted');assert.equal(bundle.result.author.site_run,true);assert.equal(bundle.independent_checks,0);assert.deepEqual(bundle.reviews,[]);assert.equal(bundle.component_reviews[0].result_id,f.result);assert.deepEqual(bundle.owner_completion_check.review_ids,[f.vote]);
 assert.deepEqual(bundle.contributing_agents.map(a=>a.id),[f.author]);assert.match(bundle.citation,/^Contributor\./);assert.doesNotMatch(bundle.citation,/^Relay\./);
 assert.equal((await acceptedGallery(db))[0].author,'Contributor');assert.equal((await trophies(db))[0].author_name,'Contributor');
 const credits=await acceptedContributors(db,out.candidate_id);assert.deepEqual(credits[0].source_result_ids,[f.result]);
 const receipt=await contributionReceipt(db,out.candidate_id);assert.equal(receipt.producing_agent.id,f.author);assert.equal(receipt.submitted_by.id,'346e9e0d-e81c-491d-9757-6d1f100249a2');
 assert.deepEqual((await read(db,['results',out.candidate_id],new URLSearchParams())).accepted_contributors,credits);
 assert.equal((await read(db,['agents',f.author],new URLSearchParams())).reliability.verified_tasks,1);
 assert.equal((await read(db,['agents','346e9e0d-e81c-491d-9757-6d1f100249a2'],new URLSearchParams())).reliability.verified_tasks,0);
 assert.ok((await publicActivity(db)).items.some(e=>e.actor==='346e9e0d-e81c-491d-9757-6d1f100249a2'&&e.action==='candidate assembled'));
 assert.ok(bundle.provenance.all_contributions.some(r=>r.id===out.candidate_id&&r.author==='346e9e0d-e81c-491d-9757-6d1f100249a2'));

});

test('stale inputs, cross-task support, pause, and failed audit roll back all finishing writes',async t=>{
 for(const scenario of ['stale','cross','pause','audit']){
  const f=await fixture(t),s=await finishingState(f.db,f.task),d=decision(f);
  if(scenario==='stale')await f.db.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES (?,?,?,?,'dispute','New contrary evidence','[]',0.9)").bind(crypto.randomUUID(),stamp,f.result,f.author).run();
  if(scenario==='cross')d.source_result_ids=[crypto.randomUUID()];
  if(scenario==='pause')await f.db.prepare('UPDATE relay_operator_control SET enabled=0').run();
  if(scenario==='audit')await f.db.prepare("CREATE TRIGGER fail_finish BEFORE INSERT ON relay_operator_receipts BEGIN SELECT RAISE(ABORT,'fixture'); END").run();
  const before=await rows(f.db,'tasks');await assert.rejects(finishWorkedTask(f.db,s,d,source));assert.deepEqual(await rows(f.db,'tasks'),before);assert.equal((await rows(f.db,'results')).length,1);assert.deepEqual(await rows(f.db,'task_handoffs'),[]);
 }
});

test('handoff-only changes preserve contract revision and owner failure holds; exact concurrent edits are fenced',async t=>{
 const f=await fixture(t);await f.db.prepare("INSERT INTO owner_verifications(created_at,result_id,review_state,actor,outcome,reason) VALUES (?,?,?,'site_owner','failed','The requested second finding is missing.')").bind(stamp,f.result,'[1,[]]').run();
 const p={next_action:'Extract one dated missing finding.',source_urls:[],desired_output:'One source-backed field note.',useful_progress:'This fills one missing required part.',max_minutes:5,kind:'contribution',result_id:f.result,expected_revision:1,expected_handoff_revision:0,reason:'Specific remaining work replaces repeated fragment review.'};
 const updated=await updateHandoff(f.db,f.task,p,null);assert.equal(updated.revision,1);assert.equal(updated.handoff_revision,1);assert.equal((await rows(f.db,'task_handoffs')).length,1);
 await assert.rejects(updateHandoff(f.db,f.task,p,null));const r=await read(f.db,['results',f.result],new URLSearchParams());assert.equal(r.owner_verification_failed,true);
});

test('scheduled finishing includes partial work without an earlier dispute and does not repeat uncertain calls',async t=>{
 const f=await fixture(t);let calls=0;
 const AI={async run(){calls++;return {choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(decision(f))}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}}};
 assert.equal(await runScheduledFinishing(f.db,AI,source,Date.now()),'FINISHED');assert.equal(calls,1);
 assert.equal(await runScheduledFinishing(f.db,AI,source,Date.now()),'ALREADY_CLAIMED');
 assert.equal(await runScheduledFinishing(f.db,AI,source,Date.now()+3600000),'NO_CANDIDATE');assert.equal(calls,1);
});

test('budget configuration upgrades existing ceilings without resetting counts or reservations',async t=>{
 const f=await fixture(t);await f.db.prepare('INSERT INTO relay_billing_limits VALUES (1,?,?)').bind(CHAT_LIMITS.dayMicrousd*2,CHAT_LIMITS.monthMicrousd*2).run();const id=await reserveChat(f.db,'synthetic',Date.now());
 await f.db.prepare('UPDATE relay_chat_buckets SET cost_limit=? WHERE kind IN (\'day\',\'month\')').bind(CHAT_LIMITS.reserveMicrousd*2).run();
 await reserveChat(f.db,'synthetic',Date.now());const bs=await rows(f.db,'relay_chat_buckets');assert.equal(bs.find(b=>b.kind==='day').calls,2);assert.equal(bs.find(b=>b.kind==='day').cost_limit,CHAT_LIMITS.dayMicrousd*2);assert.equal(bs.find(b=>b.kind==='month').cost_limit,CHAT_LIMITS.monthMicrousd*2);assert.equal((await rows(f.db,'relay_chat_calls')).find(c=>c.id===id).status,'reserved');
});

test('a prepared decision retries storage without a second inference, and a disputed cited source removes an accepted listing',async t=>{
 const f=await fixture(t);let calls=0;const AI={async run(){calls++;return {choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(decision(f))}}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}}};
 await f.db.prepare("CREATE TRIGGER storage_failure BEFORE INSERT ON results WHEN NEW.author='346e9e0d-e81c-491d-9757-6d1f100249a2' BEGIN SELECT RAISE(ABORT,'fixture'); END").run();
 const time=Date.now();assert.equal(await runScheduledFinishing(f.db,AI,source,time),'FAILED');assert.equal((await rows(f.db,'relay_finishing'))[0].status,'prepared');assert.equal(calls,1);
 await f.db.prepare('DROP TRIGGER storage_failure').run();assert.equal(await runScheduledFinishing(f.db,AI,source,time+3600000),'FINISHED');assert.equal(calls,1);assert.equal((await rows(f.db,'results')).length,2);
 const candidate=(await rows(f.db,'relay_finishing'))[0].candidate_id;await acceptReviewed(f.db,{task_id:f.task,result_id:candidate,reason:'Both required findings and their stated limits were checked.',criteria_checked:true,review_basis:'The cited independent review checked both findings; Relay made only its documented count correction.',review_ids:[f.vote],conclusion:'The two dated findings now retain the corrected count and their limitations.'});
 assert.equal((await evidenceBundle(f.db,f.task)).status,'accepted');
 await f.db.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES (?,?,?,?,'dispute','Contrary evidence on the cited source','[]',0.9)").bind(crypto.randomUUID(),stamp,f.result,f.author).run();
 assert.equal((await evidenceBundle(f.db,f.task)).status,'challenged_or_ineligible');
});
