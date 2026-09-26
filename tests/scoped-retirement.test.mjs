import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {testDatabase} from './test-db.mjs';
import {createTaskFixture} from './task-fixture.mjs';
import {register,handle,write,read,one,all,event} from '../lib/commons.ts';
import {mcp,a2a} from '../lib/protocols.ts';
import {reviewQueue,reserveReview} from '../lib/reviews.ts';
import {publicProblems} from '../lib/public-work.ts';
import {scoreboard} from '../lib/scoreboard.ts';
import {moderate,moderationQueue} from '../lib/moderation.ts';
import {publicActivity} from '../lib/activity.ts';
import {rss} from '../lib/growth.ts';
import {evidenceBundle} from '../lib/evidence-bundle.ts';
import {contributionReceipt} from '../lib/contribution-receipt.ts';
import {withIndexNow} from '../lib/indexnow.ts';
import {openapi} from '../lib/openapi.ts';
import {GET as card} from '../app/.well-known/agent-card.json/route.ts';
const code='PUBLIC_TASK_SUBMISSION_DISABLED';
const brief={title:'Synthetic public good task',description:'Only synthetic local test material.',risk_level:'low'};
const req=(path,input,token)=>new Request('https://opentaskrelay.org'+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),'x-managed':'true','x-owner-email':'owner@example.invalid'},body:JSON.stringify(input)});
const countTables=['tasks','results','verifications','artifacts','guest_submissions','human_problems','events','review_claims','notifications','rooms'];
const counts=async db=>Object.fromEntries(await Promise.all(countTables.map(async t=>[t,(await one(db,`SELECT count(*) n FROM ${t}`)).n])));
async function actors(db){return Promise.all(['Owner','Worker','Reviewer','Other reviewer'].map((name,i)=>register(db,{name,description:'Synthetic fixture',operator:'Operator '+i},'scoped-'+i)));}
async function candidate(db,owner,worker,input={}){const t=await createTaskFixture(db,{...brief,...input},owner.agent);await db.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(t.id).run();await write(db,['tasks',t.id,'claim'],{},worker.agent);const r=await write(db,['tasks',t.id,'results'],{content:'Synthetic result '+t.id,submission_key:'candidate-'+t.id},worker.agent);return {t,r};}

test('creation transports reject cached clients and forged identities before publication or persistent work',async()=>{
 const db=testDatabase(),[ordinary,managed,demo]=await actors(db);
 await db.prepare('UPDATE agents SET managed=1 WHERE id=?').bind(managed.agent.id).run();await db.prepare('UPDATE agents SET demo=1 WHERE id=?').bind(demo.agent.id).run();
 const before=await counts(db),waits=[],publications=[];
 const settings={origin:'https://opentaskrelay.org',key:'a'.repeat(32),keyLocation:'https://opentaskrelay.org/'+'a'.repeat(32)+'.txt'};
 const execute=fn=>withIndexNow(req('/api/tasks',brief),{waitUntil(p){waits.push(p)}},settings,fn,async(...v)=>{publications.push(v);return new Response('ok')});
 for(const token of [undefined,ordinary.token,managed.token,demo.token]){
  for(const path of ['/api/problems','/api/v1/problems','/api/tasks','/api/v1/tasks','/api/tasks/','/api/v1/tasks/','/api/tasks/'+ordinary.agent.id+'/subtasks','/api/v1/tasks/'+ordinary.agent.id+'/subtasks']){
   for(const extra of [{},{parent_id:ordinary.agent.id},{room_id:ordinary.agent.id},{managed:true,demo:true,creator:managed.agent.id,owner_email:'owner@example.invalid'}]){
    const response=await execute(()=>handle(db,req(path,{...brief,...extra},token)));assert.equal(response.status,410,path);assert.equal((await response.json()).error.code,code);
   }
  }
  for(const path of ['/api/mcp','/mcp'])for(const name of ['create_task','task_action'])for(const version of [undefined,'2025-06-18','2025-11-25','2026-07-28']){
   const modern=version==='2026-07-28',request=req(path,{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:name==='create_task'?brief:{task_id:ordinary.agent.id,action:'subtasks',body:brief},...(modern?{_meta:{'io.modelcontextprotocol/protocolVersion':version,'io.modelcontextprotocol/clientCapabilities':{}}}:{})}},token);
   if(version)request.headers.set('mcp-protocol-version',version);
   if(modern){request.headers.set('mcp-method','tools/call');request.headers.set('mcp-name',name);}
   const response=await execute(()=>mcp(db,request));
   assert.equal(response.status,410);assert.equal((await response.json()).error.data.code,code);
  }
  const response=await execute(()=>a2a(db,req('/a2a/message:send',{message:{messageId:'fixture',role:'ROLE_USER',parts:[{text:'Synthetic brief'}]}},token)));
  assert.equal(response.status,410);assert.equal((await response.json()).error.details[0].reason,code);
 }
 for(const agent of [ordinary.agent,{...managed.agent,managed:1},{...demo.agent,demo:1}])for(const path of [['tasks'],['tasks',ordinary.agent.id,'subtasks']])await assert.rejects(()=>write(db,path,brief,agent),{code});
 await Promise.all(waits);assert.deepEqual(await counts(db),before);assert.equal(publications.length,0);assert.equal(waits.length,0);
});

test('first review parity spans status, expiry, revisions, multiple results, pagination and reservations',async()=>{
 const db=testDatabase(),[owner,worker,reviewer,other]=await actors(db),fixtures=[];
 for(const name of ['verified','reopened','expired','obsolete','accepted','archived','multiple','reserved','partial','unknown','dispute']){
  const f=await candidate(db,owner,worker);fixtures.push({...f,name});
  if(name==='verified')await db.prepare("UPDATE tasks SET status='verified' WHERE id=?").bind(f.t.id).run();
  if(name==='reopened')await db.prepare("UPDATE tasks SET status='open',assignee=NULL WHERE id=?").bind(f.t.id).run();
  if(name==='expired')await db.prepare("UPDATE tasks SET protocol=json_set(protocol,'$.expires_at','2000-01-01T00:00:00.000Z') WHERE id=?").bind(f.t.id).run();
  if(name==='obsolete')await db.prepare("UPDATE results SET result_kind='premise_stale',contract_revision=0 WHERE id=?").bind(f.r.id).run();
  if(name==='accepted')await db.prepare("UPDATE tasks SET accepted_result_id=?,status='completed' WHERE id=?").bind(f.r.id,f.t.id).run();
  if(name==='archived')await db.prepare("UPDATE tasks SET status='closed' WHERE id=?").bind(f.t.id).run();
  if(name==='multiple')await write(db,['tasks',f.t.id,'results'],{content:'Second distinct candidate'},worker.agent);
  if(name==='reserved')await write(db,['tasks',f.t.id,'review-claim'],{result_id:f.r.id},reviewer.agent);
  if(['partial','unknown','dispute'].includes(name))await write(db,['tasks',f.t.id,'verifications'],{result_id:f.r.id,verdict:name==='dispute'?'dispute':'agree',completeness:name==='partial'?'partial':'unknown',content:'A first check; no completion claim.',confidence:.5},reviewer.agent);
 }
 const eligible=fixtures.filter(f=>['verified','reopened','multiple','reserved'].includes(f.name));
 const queue=await reviewQueue(db,100),board=await publicProblems(db,{status:'pending-review'});
 assert.equal(queue.total,5);assert.equal(queue.under_review,1);assert.equal(board.length,4);assert.deepEqual(new Set(board.map(t=>t.id)),new Set(eligible.map(f=>f.t.id)));assert.equal((await scoreboard(db)).pending_review,queue.total);
 const resultList=await read(db,['results'],new URLSearchParams());assert.ok(resultList.items.every(r=>typeof r.first_review_eligible==='boolean'));
 const rest=(await (await handle(db,new Request('https://opentaskrelay.org/api/reviews'))).json()).data;assert.equal(rest.total,5);
 const rpc=await (await mcp(db,req('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_commons',arguments:{path:'reviews'}}}))).json();assert.equal(JSON.parse(rpc.result.content[0].text).total,5);
 const first=await reviewQueue(db,2);assert.equal(first.next_offset,2);assert.equal((await reviewQueue(db,2,4)).next_offset,null);
 for(const f of fixtures){
  const task=await read(db,['tasks',f.t.id],new URLSearchParams()),result=await read(db,['results',f.r.id],new URLSearchParams());
  assert.equal(result.first_review_eligible,eligible.includes(f));assert.equal(task.results.find(r=>r.id===f.r.id).first_review_eligible,result.first_review_eligible);assert.equal(task.review_queue.total,queue.items.filter(r=>r.task_id===f.t.id).length);
  if(f.name==='archived'){assert.equal(result.review_status,'awaiting_review');assert.equal(result.review_availability,'historical');}
  if(!eligible.includes(f))await assert.rejects(()=>reserveReview(db,task,other.agent,{result_id:f.r.id}),e=>['REVIEW_CLOSED','ALREADY_REVIEWED'].includes(e.code));
 }
 const reserved=fixtures.find(f=>f.name==='reserved');await assert.rejects(()=>write(db,['tasks',reserved.t.id,'review-claim'],{result_id:reserved.r.id},other.agent));
 await write(db,['tasks',reserved.t.id,'review-release'],{result_id:reserved.r.id},reviewer.agent);await write(db,['tasks',reserved.t.id,'review-claim'],{result_id:reserved.r.id},other.agent);
});

test('synthetic quarantine hides direct and secondary content, retains private audit and accepted evidence policy',async()=>{
 const db=testDatabase(),[owner,worker,reviewer]=await actors(db),room=await write(db,['rooms'],{name:'Synthetic room',description:'Fixture'},owner.agent);
 const {t,r}=await candidate(db,owner,worker,{room_id:room.id,title:'PRIVATE_SYNTHETIC_TITLE'});
 const parent=await createTaskFixture(db,{...brief},owner.agent);await db.prepare('UPDATE tasks SET parent_id=? WHERE id=?').bind(parent.id,t.id).run();
 const artifact=await write(db,['artifacts'],{task_id:t.id,result_id:r.id,type:'report',description:'PRIVATE_SYNTHETIC_ARTIFACT',content:'PRIVATE_SYNTHETIC_CONTENT'},worker.agent);
 await event(db,worker.agent.id,'review started','results',r.id,'PRIVATE_SYNTHETIC_EVENT').run();
 await moderate(db,{task_id:t.id,decision:'quarantined',reason:'PRIVATE_MODERATION_REASON synthetic fixture'});
 for(const path of [['results',r.id],['artifacts',artifact.id],['tasks',t.id,'results'],['tasks',t.id,'evidence']])await assert.rejects(()=>read(db,path,new URLSearchParams()),{code:'NOT_FOUND'});
 for(const path of [['tasks',t.id],['tasks',parent.id],['agents',owner.agent.id],['agents',worker.agent.id],['rooms',room.id],['results'],['artifacts'],['feed']])assert.doesNotMatch(JSON.stringify(await read(db,path,new URLSearchParams())),/PRIVATE_SYNTHETIC|PRIVATE_MODERATION_REASON/);
 assert.doesNotMatch(JSON.stringify(await publicActivity(db,'all')),/PRIVATE_SYNTHETIC|PRIVATE_MODERATION_REASON/);assert.doesNotMatch(await rss(db,'https://opentaskrelay.org'),/PRIVATE_SYNTHETIC/);
 assert.match(JSON.stringify(await moderationQueue(db)),/PRIVATE_SYNTHETIC_TITLE/);assert.equal((await one(db,'SELECT id FROM artifacts WHERE id=?',artifact.id)).id,artifact.id);
 await moderate(db,{task_id:t.id,decision:'approved',reason:'PRIVATE_RESTORE_REASON synthetic fixture'});
 assert.equal((await read(db,['results',r.id],new URLSearchParams())).id,r.id);assert.doesNotMatch(JSON.stringify(await read(db,['tasks',t.id],new URLSearchParams())),/PRIVATE_MODERATION_REASON|PRIVATE_RESTORE_REASON/);
 await write(db,['tasks',t.id,'verifications'],{result_id:r.id,verdict:'agree',completeness:'complete',content:'Synthetic criteria all checked',confidence:1},reviewer.agent);await write(db,['tasks',t.id,'complete'],{result_id:r.id},owner.agent);
 await moderate(db,{task_id:t.id,decision:'quarantined',reason:'PRIVATE_ACCEPTED_REASON synthetic fixture'});
 assert.equal((await read(db,['results',r.id],new URLSearchParams())).id,r.id);assert.equal((await read(db,['artifacts',artifact.id],new URLSearchParams())).id,artifact.id);
 const bundle=await evidenceBundle(db,t.id);assert.equal(bundle.status,'challenged_or_ineligible');assert.equal(bundle.result.id,r.id);assert.doesNotMatch(JSON.stringify(bundle),/PRIVATE_ACCEPTED_REASON/);assert.equal(await contributionReceipt(db,r.id),null);
});

test('discovery and deprecated SDK helpers do not offer or transmit task creation',async()=>{
 const api=openapi('https://opentaskrelay.org');assert.equal(api.paths['/tasks'].post,undefined);assert.equal(api.paths['/tasks/{id}/subtasks'],undefined);assert.equal(api.components.schemas.Task,undefined);assert.ok(api.paths['/tasks/{id}/results'].post);
 const cardData=await (await card(new Request('https://opentaskrelay.org/.well-known/agent-card.json'))).json();assert.deepEqual(cardData.skills,[]);assert.deepEqual(cardData.defaultInputModes,[]);
 for(const sdk of [await import('../public/sdk/opentaskrelay.mjs'),await import('../public/sdk/agent-commons.mjs')]){const C=sdk.OpenTaskRelay||sdk.AgentCommons,c=new C();c.request=()=>{throw new Error('Unexpected network')};assert.throws(()=>c.createTask(brief),new RegExp(code));assert.throws(()=>c.subtask(crypto.randomUUID(),brief),new RegExp(code));}
 execFileSync('python3',['-c',`import sys\nsys.path.insert(0,'public/sdk')\nfor filename in ['opentaskrelay','agent_commons']:\n m=__import__(filename); c=(getattr(m,'OpenTaskRelay',None) or m.AgentCommons)()\n c.request=lambda *a,**k: (_ for _ in ()).throw(AssertionError('Unexpected network'))\n for f in [lambda:c.create_task(title='test'),lambda:c.subtask('id',title='test')]:\n  try: f(); raise AssertionError('Expected rejection')\n  except RuntimeError as e: assert '${code}' in str(e)\n`]);
});
