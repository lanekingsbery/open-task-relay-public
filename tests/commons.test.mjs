import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handle,read} from '../lib/commons.ts';
import {a2a,mcp} from '../lib/protocols.ts';
import {runDemo} from '../lib/demo.ts';
import {GET as card} from '../app/.well-known/agent-card.json/route.ts';
import {GET as discovery} from '../app/agents.json/route.ts';
import {openapi} from '../lib/openapi.ts';
function db(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));return {prepare(s){let args=[];const stmt=sql.prepare(s);return {query:s,bind(...v){args=v;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return stmt.run(...args)}}},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}}}
const request=(path,method='GET',value,token,headers={})=>new Request('https://commons.test'+path,{method,headers:{...(value!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(value!==undefined?{body:JSON.stringify(value)}:{})});
test('OpenAPI task-list descriptions and advertised values match the permissive runtime contract',async()=>{
 const spec=openapi('https://commons.test'),list=spec.paths['/tasks'].get;
 const params=Object.fromEntries(list.parameters.map(p=>[p.name,p]));
 assert.deepEqual(params.status.schema.examples,['open','claimed','in_progress','submitted','verified','completed','disputed','premise_stale','closed','pending-review']);
 assert.equal(params.status.schema.enum,undefined,'Runtime accepts arbitrary literal strings');
 assert.equal(params.ready.schema.default,undefined,'Readiness default depends on transport and parameter presence');
 assert.equal(params.sort.schema.default,undefined,'Omitted sort differs from best and explicit newest ties');
 assert.equal(params.limit.schema.default,50);assert.equal(params.offset.schema.default,0);assert.equal(params.view.schema.default,'full');
 for(const [description,patterns] of [
  [params.status.description,[/no accepted result/,/non-demo submission/,/either verdict/,/Returned status stays literal/,/including pending-review, returns no matches/]],
  [params.ready.description,[/strictly in the future/,/false disables readiness/,/both status and ready are absent/,/even an empty status/,/Explicit status does not cancel explicit ready=true/,/never apply readiness implicitly/]],
  [list.description,[/filters intersect before sorting and pagination/,/expired tasks remain visible/,/leases reopen and clear assignee/,/existing results and acceptance criteria before/]],
  [list.responses['200'].description,[/offset \+ limit/,/otherwise null/,/same filters, sort, view and limit/,/No snapshot/,/above 100000 are rejected/]],
 ])for(const pattern of patterns)assert.match(description,pattern);
 const {register,insert,taskContract}=await import('../lib/commons.ts');
 const d=db(),owner=(await register(d,{name:'Contract owner',description:'Local fixture'},'contract-owner')).agent;
 const producer=(await register(d,{name:'Contract producer',description:'Local fixture'},'contract-producer')).agent;
 const reviewer=(await register(d,{name:'Contract reviewer',description:'Local fixture'},'contract-reviewer')).agent;
 const taskId=crypto.randomUUID(),resultId=crypto.randomUUID(),stamp='2025-01-01T00:00:00.000Z';
 await insert(d,'tasks',{id:taskId,created_at:stamp,updated_at:stamp,creator:owner.id,title:'Contract fixture',description:'Local only',required_capabilities:['contract-fixture'],status:'open',moderation_status:'approved',protocol:taskContract.parse({risk_level:'low'})}).run();
 const get=async(query={},version='')=>{const r=await handle(d,request('/api/'+version+'tasks?'+new URLSearchParams({capability:'contract-fixture',...query})));assert.equal(r.status,200);return (await r.json()).data;};
 for(const status of params.status.schema.examples.filter(s=>s!=='pending-review')){
  await d.prepare('UPDATE tasks SET status=? WHERE id=?').bind(status,taskId).run();
  assert.deepEqual((await get({status})).items.map(t=>t.status),[status]);
  assert.equal((await get({status,ready:'true'})).items.length,status==='open'?1:0);
 }
 await d.prepare("UPDATE tasks SET status='submitted' WHERE id=?").bind(taskId).run();
 assert.equal((await get()).items.length,0);
 for(const query of [{status:''},{ready:'false'},{ready:''},{ready:'TRUE'}])assert.equal((await get(query)).items.length,1);
 assert.equal((await get({},'v1/')).items.length,1);
 for(const status of ['all','active','working','review','solved','unknown','SUBMITTED'])assert.equal((await get({status})).items.length,0);
 // The computed queue requires a submission and removes it after either eligible verdict.
 assert.equal((await get({status:'pending-review'})).items.length,0);
 await insert(d,'results',{id:resultId,created_at:stamp,task_id:taskId,author:producer.id,content:'Local contribution',evidence:[]}).run();
 for(const status of ['submitted','verified','disputed']){
  await d.prepare('UPDATE tasks SET status=? WHERE id=?').bind(status,taskId).run();
  assert.deepEqual((await get({status:'pending-review'})).items.map(t=>t.status),[status]);
 }
 assert.equal((await get({status:'pending-review',ready:'true'})).items.length,0);
 await d.prepare('UPDATE tasks SET accepted_result_id=? WHERE id=?').bind(resultId,taskId).run();
 assert.equal((await get({status:'pending-review'})).items.length,0);
 await d.prepare('UPDATE tasks SET accepted_result_id=NULL WHERE id=?').bind(taskId).run();
 await insert(d,'verifications',{id:crypto.randomUUID(),created_at:stamp,result_id:resultId,author:reviewer.id,verdict:'dispute',content:'Local check',evidence:[],confidence:1}).run();
 assert.equal((await get({status:'pending-review'})).items.length,0);
 for(const [name,p] of Object.entries(params))for(const value of p.schema.enum||p.schema.examples||[]){
  await get({[name]:String(value)}); // Every advertised query value is accepted by the handler.
 }
 for(const name of ['limit','offset','max_minutes','max_leg_minutes']){
  const {minimum,maximum}=params[name].schema;
  for(const value of [minimum,maximum])await get({[name]:String(value)});
  for(const value of [minimum-1,maximum+1])assert.equal((await handle(d,request('/api/tasks?'+name+'='+value))).status,422);
 }
});
test('compact discovery preserves selection and legacy contracts across REST and MCP',async()=>{
 const d=db();
 const {launchMissions}=await import('../lib/missions.ts');
 await launchMissions(d);
 const get=async(path,status=200)=>{const r=await handle(d,request(path));const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body.data||body.error;};
 const queries=['limit=10&max_leg_minutes=5','limit=2&offset=2','limit=2&sort=shortest','limit=2&sort=featured&category=open-data','limit=2&capability=research&difficulty=easy','limit=2&status=pending-review','limit=1&offset=100000','capability=no-such-capability'];
 for(const query of queries){
  const full=await get('/api/tasks?'+query),summary=await get('/api/tasks?'+query+'&view=summary');
  assert.deepEqual(summary.items.map(t=>t.id),full.items.map(t=>t.id),query);
  assert.equal(summary.next_offset,full.next_offset,query);
  assert.equal(summary.view,'summary');assert.match(summary.instructions,/full task.*before claiming/);
  assert.deepEqual(await get('/api/tasks?'+query+'&view=full'),full);
  for(let i=0;i<summary.items.length;i++){
   const t=summary.items[i],original=full.items[i];
   for(const key of ['id','title','status','category','difficulty','required_capabilities','allowed_tools','risk_level','external_side_effects_allowed','moderation_status','expires_at'])assert.deepEqual(t[key],original[key],key);
   assert.equal(t.relay_leg.max_minutes,original.relay_leg.max_minutes);
   assert.equal(t.relay_leg.kind,original.relay_leg.kind);
   assert.ok(t.relay_leg.max_minutes<=5&&t.relay_leg.next_action_preview.length<=280);
   assert.equal(t.description,undefined);assert.equal(t.acceptance_criteria,undefined);assert.equal(t.relay_leg.source_expectations,undefined);
   assert.equal(t.detail_url,'/api/tasks/'+t.id);
  }
 }
 const full=await get('/api/tasks?limit=10'),summary=await get('/api/tasks?limit=10&view=summary');
 assert.equal(full.items.length,10);assert.equal(summary.next_offset,10);
 assert.ok(Buffer.byteLength(JSON.stringify(summary))<Buffer.byteLength(JSON.stringify(full))*0.25,'selection payload should be less than a quarter of the full seeded contracts');
 const candidate=summary.items[0],detail=await get(candidate.detail_url);
 assert.equal(detail.id,candidate.id);assert.ok(detail.acceptance_criteria.length);assert.ok(Array.isArray(detail.results));
 assert.deepEqual(await get(candidate.detail_url+'?view=summary'),detail,'detail must never become a partial work contract');
 await d.prepare("UPDATE tasks SET protocol=json_set(protocol,'$.next_action',?,'$.relay_leg_minutes',15) WHERE id=?").bind('Inspect this evidence. '.repeat(40),candidate.id).run();
 const bounded=(await get('/api/tasks?limit=1&view=summary')).items[0];
 assert.equal(bounded.id,candidate.id);assert.equal(bounded.relay_leg.next_action_preview.length,280);assert.ok(bounded.relay_leg.next_action_preview.endsWith('…'));assert.equal(bounded.relay_leg.max_minutes,5);
 assert.equal((await get(candidate.detail_url)).relay_leg_minutes,15,'stored legacy budget stays intact');
 const query={view:'summary',ready:'true',max_leg_minutes:'5',limit:'2'};
 const rest=await get('/api/v1/tasks?'+new URLSearchParams(query));
 assert.deepEqual(rest,await get('/api/tasks?'+new URLSearchParams(query)));
 const rpc=await mcp(d,request('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_commons',arguments:{path:'tasks',query}}}));
 assert.equal(rpc.status,200);const result=(await rpc.json()).result;assert.equal(result.isError,false);assert.deepEqual(JSON.parse(result.content[0].text),rest);
 assert.equal((await get('/api/tasks?view=invalid',422)).code,'VALIDATION_ERROR');
 const manifest=await discovery(request('/agents.json')).json();assert.match(manifest.task_summaries,/view=summary/);assert.equal(manifest.tasks,'https://opentaskrelay.org/api/tasks');
 const spec=openapi('https://commons.test');assert.deepEqual(spec.paths['/tasks'].get.parameters.find(p=>p.name==='view').schema.enum,['full','summary']);
});
test('complete machine workflow, permissions, validation and protocol discovery',async()=>{const d=db();const call=async(p,m='GET',b,t,expected=m==='GET'?200:201)=>{const r=await handle(d,request('/api/v1/'+p,m,b,t));const j=await r.json();assert.equal(r.status,expected,JSON.stringify(j));if(m==='POST'&&j.data?.title&&j.data.moderation_status==='pending'){await d.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(j.data.id).run();j.data.moderation_status='approved'}return j.data};
 const c=await (await card(request('/.well-known/agent-card.json'))).json();assert.equal(c.supportedInterfaces[0].protocolVersion,'1.0');assert.equal((await (await discovery(request('/agents.json'))).json()).openapi,'https://opentaskrelay.org/openapi.json');assert.ok(openapi('https://commons.test').paths['/tasks/{id}/verifications']);
 const agents=[];for(const name of ['Lead','Worker','Verifier','Critic'])agents.push(await call('agents','POST',{name,description:'Test agent',capabilities:['research','statistics']}));const [lead,worker,verifier,critic]=agents;
 assert.ok(lead.token.startsWith('ac_'));assert.equal(lead.agent.token_hash,undefined);const list=await call('agents?capability=research,statistics');assert.equal(list.items.length,4);assert.equal(list.items[0].token_hash,undefined);assert.equal((await call('agents?capability=search')).items.length,0);
 await call('rooms','POST',{name:'Bad',description:'test'},'invalid',401);await call('rooms','POST',{name:'Bad',description:'test'},'ac_'+'0'.repeat(64),401);await call('agents','POST',{name:'',description:[]},undefined,422);
 const room=await call('rooms','POST',{name:'Research',description:'Evidence room'},lead.token);const message=await call('messages','POST',{room_id:room.id,content:'A finding',evidence:['https://example.org/source']},worker.token);await call('messages','POST',{room_id:room.id,parent_id:message.id,content:'Reply'},verifier.token);assert.equal((await call('messages/'+message.id)).replies.length,1);
 await call('messages','POST',{room_id:room.id,content:'secret '+lead.token},worker.token,422);await call('messages','POST',{room_id:room.id,content:'x'.repeat(40000)},worker.token,413);await call('messages','POST',{room_id:room.id,content:'url',evidence:['javascript:alert(1)']},worker.token,422);
 const task=await call('tasks','POST',{title:'Research task',description:'Check evidence',room_id:room.id},lead.token);const sub=await call('tasks/'+task.id+'/subtasks','POST',{title:'Subtask',description:'Parallel piece'},lead.token);await call('tasks/'+task.id+'/subtasks','POST',{title:'Unauthorized',description:'Piece'},critic.token,403);
 await call('tasks/'+sub.id+'/claim','POST',{},worker.token);await call('tasks/'+sub.id+'/claim','POST',{},critic.token,409);await call('tasks/'+sub.id+'/start','POST',{},worker.token);
 const result=await call('tasks/'+sub.id+'/results','POST',{content:'Result',confidence:0.8},worker.token);await call('tasks/'+sub.id+'/request-verification','POST',{},lead.token);await call('tasks/'+sub.id+'/verifications','POST',{result_id:result.id,verdict:'agree',completeness:'complete',content:'Self vote',confidence:1},worker.token,403);
 await call('tasks/'+sub.id+'/verifications','POST',{result_id:result.id,verdict:'dispute',content:'Evidence does not support claim',confidence:1},critic.token);await call('tasks/'+sub.id+'/complete','POST',{result_id:result.id},lead.token,409);
 const fixed=await call('tasks/'+sub.id+'/results','POST',{content:'Corrected result'},worker.token);await call('tasks/'+sub.id+'/verifications','POST',{result_id:fixed.id,verdict:'agree',completeness:'complete',content:'Checked',confidence:1},verifier.token);await call('tasks/'+sub.id+'/verifications','POST',{result_id:fixed.id,verdict:'agree',completeness:'complete',content:'Repeat',confidence:1},verifier.token,409);await call('tasks/'+sub.id+'/complete','POST',{result_id:fixed.id},lead.token);
 await call('tasks/'+task.id+'/claim','POST',{},lead.token);const final=await call('tasks/'+task.id+'/results','POST',{content:'Final summary'},lead.token);await call('tasks/'+task.id+'/verifications','POST',{result_id:final.id,verdict:'agree',completeness:'complete',content:'Independent check',confidence:1},verifier.token);await call('tasks/'+task.id+'/complete','POST',{result_id:final.id},lead.token);
 const artifact=await call('artifacts','POST',{task_id:task.id,result_id:final.id,type:'report',description:'Final publication',content:'Text output'},lead.token);assert.equal(artifact.provenance.produced_by,lead.agent.id);assert.equal((await call('artifacts/'+artifact.id)).provenance.verification_at_publication.agree,1);assert.equal((await call('tasks/'+task.id)).subtasks.length,1);assert.ok((await call('feed')).items.length>10);assert.equal((await call('rooms/'+room.id)).participants.length,2);
 const a=await a2a(d,request('/a2a/message:send','POST',{message:{messageId:'test-1',role:'ROLE_USER',parts:[{text:'Investigate this question'}]}},worker.token,{'A2A-Version':'1.0'}));assert.equal(a.status,200);const at=await a.json();assert.equal(at.task.status.state,'TASK_STATE_SUBMITTED');assert.equal((await a2a(d,request('/a2a/tasks/'+at.task.id,'GET',undefined,worker.token))).status,200);
 let mr=await mcp(d,request('/mcp','POST',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}}));assert.equal((await mr.json()).result.protocolVersion,'2025-11-25');mr=await mcp(d,request('/mcp','POST',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'read_commons',arguments:{path:'stats'},_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientCapabilities':{}}}},undefined,{'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':'read_commons',Accept:'application/json, text/event-stream'}));assert.equal((await mr.json()).result.isError,false);assert.equal((await mcp(d,request('/mcp','POST',{jsonrpc:'2.0',id:3,method:'tools/list'},undefined,{Origin:'https://evil.test'}))).status,403);
 await call('agents/me/revoke','POST',{},critic.token);await call('rooms','POST',{name:'Revoked',description:'no'},critic.token,401);
});
test('deterministic demo completes with retained disputes and provenance; rerun is bounded',async()=>{const d=db();const result=await runDemo(d);assert.equal(result.status,'completed');const t=await read(d,['tasks',result.task_id],new URLSearchParams());assert.equal(t.status,'completed');assert.equal(t.subtasks.length,2);assert.equal(t.artifacts.length,1);const agents=await read(d,['agents'],new URLSearchParams());assert.equal(agents.items.length,6);assert.ok(agents.items.filter(a=>!a.managed).every(a=>a.demo===1));assert.equal((await runDemo(d)).status,'already_started')});
test('registration throttle enforced',async()=>{const d=db();for(let i=0;i<9;i++){const r=await handle(d,request('/api/v1/agents','POST',{name:'Agent '+i,description:'A client'}));assert.equal(r.status,i<8?201:429)}});

test('no-signup utilities preserve meaningful differences and reject unsafe input',async()=>{
 const {utility}=await import('../lib/utilities.ts');
 const d=utility('citation-audit',{sources:['doi:10.1000/ABC','https://doi.org/10.1000/abc','https://arxiv.org/pdf/2401.12345v2.pdf','https://arxiv.org/abs/2401.12345v2','https://arxiv.org/abs/2401.12345v1','https://example.org/p?utm_source=email','https://example.org/p','https://example.org/p?id=2','javascript:alert(1)']});
 assert.equal(d.duplicate_groups.length,3);assert.equal(d.unique_document_candidates,5);assert.equal(d.entries[8].key,null);
 assert.equal(utility('validate-json',{text:'{"ok":true}'}).valid,true);assert.equal(utility('validate-json',{text:'{"ok":}'}).valid,false);
 assert.throws(()=>utility('citation-audit',{sources:Array(51).fill('https://example.org')}));
});
test('real missions and community metrics exclude site-operated and demo agents',async()=>{
 const {launchMissions}=await import('../lib/missions.ts');const d=db();
 const start=await launchMissions(d);assert.equal(start.task_ids.length,10);assert.equal((await launchMissions(d)).status,'already_started');
 const missions=await read(d,['opportunities'],new URLSearchParams());assert.equal(missions.open_tasks.length,30);
 const metrics=await read(d,['adoption'],new URLSearchParams());assert.equal(metrics.community_agents,0);
 const post=async(path,value,token)=>{const response=await handle(d,request('/api/v1/'+path,'POST',value,token));const j=await response.json();assert.equal(response.status,201,JSON.stringify(j));return j.data};
 const worker=await post('agents',{name:'Community worker',description:'Researches primary evidence'});const verifier=await post('agents',{name:'Community reviewer',description:'Independently checks evidence'});
 // Select the actual paper mission, not whichever seed happens to sort first in this millisecond.
 const taskId=(await d.prepare("SELECT id FROM tasks WHERE title='AlphaGeometry (2024): audit the Olympiad comparison'").first()).id;await post('tasks/'+taskId+'/claim',{},worker.token);const result=await post('tasks/'+taskId+'/results',{content:'Original assessment',evidence:['https://www.nature.com/articles/s41586-023-06747-5']},worker.token);await post('tasks/'+taskId+'/verifications',{result_id:result.id,verdict:'agree',completeness:'complete',content:'Independent review',confidence:0.8},verifier.token);
 const daily=await launchMissions(d,true);assert.equal(daily.status,'backlog_full');assert.equal(daily.published.length,0);assert.notEqual((await read(d,['tasks',taskId],new URLSearchParams())).status,'completed');assert.equal((await launchMissions(d,true)).status,'already_started');
 await runDemo(d);const after=await read(d,['adoption'],new URLSearchParams());assert.equal(after.community_agents,2);assert.equal(after.community_artifacts,0);assert.equal(after.verified_community_tasks,0);
});
test('JavaScript connection client protects token destination and decodes errors',async()=>{
 const {AgentCommons,CommonsError}=await import('../public/sdk/agent-commons.mjs');assert.throws(()=>new AgentCommons({origin:'http://insecure.test'}));
 const client=new AgentCommons({token:'test-token',origin:'https://commons.test'});await assert.rejects(()=>client.request('https://evil.test'));
 const previous=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url.origin,'https://commons.test');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-token');return Response.json({data:{items:[{id:'task'}]}})};
 try{assert.equal((await client.findTasks({capability:'research'}))[0].id,'task')}finally{globalThis.fetch=previous}
});

test('task commons contract, safe discovery, abuse boundaries and audit hashes',async()=>{
 const d=db();const call=async(path,method='GET',value,token,status=method==='GET'?200:201)=>{const r=await handle(d,request(path,method,value,token));const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));if(method==='POST'&&j.data?.title&&j.data.risk_level==='low')await d.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(j.data.id).run();return j.data};
 const lead=await call('/api/v1/agents','POST',{name:'Task curator',description:'Test fixture'});
 const worker=await call('/api/v1/agents','POST',{name:'Task worker',description:'Test fixture'});
 const legacy=await call('/api/tasks','POST',{title:'Needs review',description:'Incomplete legacy brief'},lead.token);
 assert.equal(legacy.risk_level,'review_required');assert.equal((await call('/api/tasks')).items.length,0);
 const brief={title:'Check inline JSON',description:'Explain why {"a":} is invalid JSON. Return a proposed correction only.',objective:'Identify syntax error',risk_level:'low',category:'open-data',difficulty:'easy',estimated_minutes:5,required_capabilities:['json'],expected_output:'One corrected JSON value plus explanation',acceptance_criteria:['Identify missing value','Return valid JSON'],license:'CC0-1.0'};
 await call('/api/tasks','POST',{...brief,external_side_effects_allowed:true},lead.token,422);
 await call('/api/tasks','POST',{...brief,allowed_tools:['credential_use']},lead.token,422);
 await call('/api/tasks','POST',{...brief,risk_level:'high'},lead.token,422);
 await call('/api/tasks','POST',{...brief,inputs:[{description:'Poisoned link',url:'https://127.0.0.1/private'}]},lead.token,422);
 await call('/api/tasks','POST',{...brief,prohibited_actions:[]},lead.token,422);
 const expired=await call('/api/tasks','POST',{...brief,expires_at:'2000-01-01T00:00:00.000Z'},lead.token);
 await call('/api/tasks/'+expired.id+'/claim','POST',{},worker.token,409);
 const task=await call('/api/tasks','POST',brief,lead.token);
 const listed=(await call('/api/tasks?capability=json')).items;assert.equal(listed.length,1);assert.equal(listed[0].id,task.id);assert.equal(listed[0].external_side_effects_allowed,false);
 await call('/api/tasks/'+task.id+'/unknown','GET',undefined,undefined,404);
 await call('/api/tasks/'+task.id+'/claim','POST',{},worker.token);
 const result=await call(task.submission_endpoint,'POST',{content:'{"a":null}\nThe original value is missing.'},worker.token);
 const detail=await call('/api/tasks/'+task.id);assert.equal(detail.results[0].id,result.id);assert.match(detail.results[0].content_sha256,/^[a-f0-9]{64}$/);assert.equal(detail.results[0].acceptance_status,'pending_review');assert.ok(detail.audit_events.some(e=>e.action==='submitted'));assert.equal(detail.revision,1);assert.equal(detail.protocol,undefined);
 assert.ok(openapi('https://commons.test').components.schemas.Task.properties.external_side_effects_allowed.const===false);
});

test('moderation, lease recovery, output checks and idempotent retries cannot be bypassed',async()=>{
 const {moderate,authorizeModerator}=await import('../lib/moderation.ts');const d=db();
 const call=async(path,method='GET',value,token,status=method==='GET'?200:201)=>{const r=await handle(d,request('/api/'+path,method,value,token));const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j.data};
 const creator=await call('v1/agents','POST',{name:'Test curator',description:'Isolated fixture'}),worker=await call('v1/agents','POST',{name:'Test contributor',description:'Isolated fixture'});
 const task=await call('tasks','POST',{title:'JSON correction',description:'Return a JSON object proposing a correction.',risk_level:'low',output_format:'json',required_output_keys:['proposed']},creator.token);
 assert.equal(task.moderation_status,'pending');assert.equal((await call('tasks')).items.length,0);await call('tasks/'+task.id+'/claim','POST',{},worker.token,409);
 assert.throws(()=>authorizeModerator(null,'owner@example.com'));assert.throws(()=>authorizeModerator('other@example.com','owner@example.com'));assert.doesNotThrow(()=>authorizeModerator('owner@example.com','owner@example.com'));
 await moderate(d,{task_id:task.id,decision:'approved',reason:'Reviewed isolated JSON-only task.'});assert.equal((await call('tasks')).items.length,1);
 const claimed=await call('tasks/'+task.id+'/claim','POST',{},worker.token);assert.ok(Date.parse(claimed.claim_expires_at)>Date.now());
 await call('tasks/'+task.id+'/release','POST',{},creator.token,409);await call('tasks/'+task.id+'/renew','POST',{},worker.token);
 await d.prepare("UPDATE tasks SET claim_expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").bind(task.id).run();assert.equal((await call('tasks')).items.length,1);await call('tasks/'+task.id+'/results','POST',{content:'{}'},worker.token,409);
 await call('tasks/'+task.id+'/claim','POST',{},worker.token);await call('tasks/'+task.id+'/results','POST',{content:'not JSON'},worker.token,422);
 await call('tasks/'+task.id+'/results','POST',{content:'{}'},worker.token,422);
 const payload={content:'{"proposed":true}',submission_key:'retry-safe-001'};const result=await call('tasks/'+task.id+'/results','POST',payload,worker.token);assert.equal(result.validation.validator,'json-contract-v1');assert.equal((await call('tasks/'+task.id+'/results','POST',payload,worker.token)).id,result.id);
 await call('tasks/'+task.id+'/results','POST',{...payload,content:'{}'},worker.token,409);assert.equal((await call('tasks/'+task.id)).results.length,1);
 await moderate(d,{task_id:task.id,decision:'quarantined',reason:'Testing the moderator quarantine gate.'});await call('tasks/'+task.id+'/results','POST',{content:'{}'},worker.token,409);
 const rpc=await mcp(d,request('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'task_action',arguments:{task_id:task.id,action:'claim',body:{}}}},worker.token));assert.equal(rpc.status,409);
 const stub=await call('tasks/'+task.id);assert.equal(stub.redacted,true);assert.equal(stub.title,'Quarantined task');assert.equal(stub.actionable,false);assert.equal(stub.audit_events,undefined);assert.doesNotMatch(JSON.stringify(stub),/JSON correction|proposed/);
 await call('tasks/'+task.id+'/results','GET',undefined,undefined,404);
 assert.equal((await call('results?task_id='+task.id)).items.length,0);
});


test('quarantined abuse is a public audit stub while originals remain private and reversible',async()=>{
 const {register,write}=await import('../lib/commons.ts');
 const {moderate}=await import('../lib/moderation.ts');
 const {discussion}=await import('../lib/guest-board.ts');
 const {publicTask}=await import('../lib/public-work.ts');
 const {publicActivity}=await import('../lib/activity.ts');
 const d=db(),owner=(await register(d,{name:'Quarantine owner',description:'Local fixture'},'quarantine-owner')).agent;
 owner.managed=1;
 const worker=(await register(d,{name:'Quarantine worker',description:'Local fixture'},'quarantine-worker')).agent;
 const task=await write(d,['tasks'],{title:'PROMO WALLET LANDING PAGE',description:'Send funds to promoted wallet.example now',risk_level:'low',inputs:[{description:'Promoted payment link',url:'https://example.com/wallet'}]},owner);
 await write(d,['tasks',task.id,'claim'],{},worker);
 const result=await write(d,['tasks',task.id,'results'],{content:'PROMOTIONAL RESULT BODY https://example.com/pay'},worker);
 await d.prepare("INSERT INTO board_comments(id,created_at,task_id,kind,content,content_hash,hidden) VALUES(?,?,?,?,?,?,0)").bind(crypto.randomUUID(),new Date().toISOString(),task.id,'note','PROMOTIONAL DISCUSSION BODY','fixture').run();
 const original=await d.prepare('SELECT title,description,protocol FROM tasks WHERE id=?').bind(task.id).first();
 assert.equal(original.title,'PROMO WALLET LANDING PAGE');
 await moderate(d,{task_id:task.id,decision:'quarantined',reason:'Repeated payment and wallet promotion in synthetic fixture.'});
 const detail=await read(d,['tasks',task.id],new URLSearchParams());
 assert.equal(detail.redacted,true);assert.equal(detail.moderation_status,'quarantined');assert.equal(detail.status,'closed');
 const serialized=JSON.stringify(detail);for(const secret of ['PROMO WALLET','Send funds','wallet.example','example.com/wallet','PROMOTIONAL RESULT'])assert.ok(!serialized.includes(secret));
 const publicLookup=await publicTask(d,task.id);assert.equal(publicLookup.title,'Quarantined task');assert.ok(!JSON.stringify(publicLookup).includes('PROMO WALLET'));
 assert.deepEqual(await discussion(d,task.id),{items:[],next_offset:null,moderation_status:'quarantined'});
 let response=await handle(d,request('/api/v1/tasks/'+task.id+'/results'));assert.equal(response.status,404);
 response=await handle(d,request('/api/v1/results/'+result.id));assert.equal(response.status,200);assert.equal((await response.json()).data.id,result.id,'Known immutable result receipts remain addressable by exact ID');
 response=await handle(d,request('/api/v1/results?task_id='+task.id));assert.equal(response.status,200);assert.equal((await response.json()).data.items.length,0);
 const feed=await read(d,['feed'],new URLSearchParams({limit:'100'}));assert.doesNotMatch(JSON.stringify(feed),/PROMO WALLET|Send funds|wallet\.example/);
 const operations=await publicActivity(d,'operations');const moderation=operations.items.find(e=>e.task_id===task.id);assert.equal(moderation.task_title,'Quarantined task');assert.match(moderation.summary,/quarantined task; original content hidden/);assert.doesNotMatch(JSON.stringify(operations),/PROMO WALLET|Send funds|wallet\.example/);
 assert.equal((await d.prepare('SELECT content FROM results WHERE id=?').bind(result.id).first()).content,'PROMOTIONAL RESULT BODY https://example.com/pay');
 assert.equal((await d.prepare('SELECT content FROM board_comments WHERE task_id=?').bind(task.id).first()).content,'PROMOTIONAL DISCUSSION BODY');
 await moderate(d,{task_id:task.id,decision:'approved',reason:'Synthetic fixture restored after moderation review.'});
 assert.equal((await read(d,['tasks',task.id],new URLSearchParams())).title,'PROMO WALLET LANDING PAGE');
 assert.equal((await discussion(d,task.id)).items[0].content,'PROMOTIONAL DISCUSSION BODY');
});

test('additive upgrade preserves existing tasks while seeding one real bounded audit',()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');const files=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();for(const f of files.filter(f=>f<'0004'))sql.exec(readFileSync('drizzle/'+f,'utf8'));
 sql.exec("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen,managed) VALUES ('curator','2026-09-01T00:00:00Z','Commons Mission Desk','Curated tasks','[]','[]','curatorhash','2026-09-01T00:00:00Z',1),('community','2026-09-01T00:00:00Z','Community','Community tasks','[]','[]','communityhash','2026-09-01T00:00:00Z',0)");
 sql.exec("INSERT INTO tasks(id,created_at,creator,title,description,required_capabilities,status,updated_at) VALUES ('prior','2026-09-01T00:00:00Z','community','Prior task','Original content','[]','claimed','2026-09-01T00:00:00Z')");
 sql.exec(readFileSync('drizzle/0004_moderation_leases.sql','utf8'));
 const prior=sql.prepare("SELECT * FROM tasks WHERE id='prior'").get();assert.equal(prior.description,'Original content');assert.equal(prior.moderation_status,'pending');assert.ok(prior.claim_expires_at);
 const seeded=sql.prepare("SELECT * FROM tasks WHERE creator='curator'").all();assert.equal(seeded.length,1);assert.equal(seeded[0].moderation_status,'approved');assert.equal(JSON.parse(seeded[0].protocol).output_format,'json');sql.close();
});

test('atomic write guard rolls back submission when moderation changes concurrently',async()=>{
 const {register,write}=await import('../lib/commons.ts');const {moderate}=await import('../lib/moderation.ts');const d=db();const a=(await register(d,{name:'Race fixture',description:'Isolated test'},'race')).agent;
 const t=await write(d,['tasks'],{title:'Race task',description:'Bounded text'},a);await moderate(d,{task_id:t.id,decision:'approved',reason:'Approved isolated test fixture.'});await write(d,['tasks',t.id,'claim'],{},a);
 const original=d.batch;d.batch=async statements=>{if(statements.length===5)await d.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(t.id).run();return original(statements)};
 await assert.rejects(()=>write(d,['tasks',t.id,'results'],{content:'Should not persist'},a),e=>e.code==='INVALID_STATE');
 assert.equal((await d.prepare('SELECT count(*) AS n FROM results').first()).n,0);assert.equal((await d.prepare('SELECT count(*) AS n FROM mutation_guards').first()).n,0);
});

test('human problem ownership, moderation, acceptance, private notices and dispute removal',async()=>{
 const {submitProblem,myProblems,requestPrivacy}=await import('../lib/humans.ts');
 const {moderate,acceptReviewed,removeContact}=await import('../lib/moderation.ts');
 const {dispatchNotifications}=await import('../lib/notifications.ts');
 const {trophies,publicProblems}=await import('../lib/public-work.ts');
 const d=db(),human={id:'private-site-person-one',email:'test-owner@example.invalid'},other={id:'private-site-person-two',email:'other@example.invalid'};
 const brief={title:'Check public form label clarity',problem:'Review the public form labels for ambiguity.',why:'Clear labels help people submit useful public problems.',output:'Return exact proposed label changes and source evidence.',done:'Identify each ambiguous control and explain the proposed correction.',sources:['https://www.w3.org/WAI/tutorials/forms/labels/'],category:'accessibility',public_consent:true};
 await assert.rejects(()=>submitProblem(d,null,brief),e=>e.status===401);
 await assert.rejects(()=>submitProblem(d,{id:null,email:human.email},brief),e=>e.status===401);
 await assert.rejects(()=>submitProblem(d,human,{...brief,public_consent:false}));
 await assert.rejects(()=>submitProblem(d,human,{...brief,sources:['https://127.0.0.1/private']}));
 const task=await submitProblem(d,human,brief);assert.equal(task.status,'pending');assert.equal((await myProblems(d,human)).length,1);assert.equal((await myProblems(d,other)).length,0);
 const publicRecord=await read(d,['tasks',task.id],new URLSearchParams());assert.equal(publicRecord.moderation_status,'pending');assert.equal(publicRecord.published_at,null);assert.doesNotMatch(JSON.stringify(publicRecord),/test-owner|private-site-person/);assert.equal((await publicProblems(d,{})).length,0);
 const post=async(path,input,token,status=201)=>{const r=await handle(d,request('/api/tasks/'+path,'POST',input,token));const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j.data};
 const reg=async name=>(await (await handle(d,request('/api/v1/agents','POST',{name,description:'Isolated test fixture'}))).json()).data;
 const worker=await reg('Human problem worker'),reviewer=await reg('Independent reviewer'),critic=await reg('Later critic');
 await post(task.id+'/claim',{},worker.token,409);await moderate(d,{task_id:task.id,decision:'approved',reason:'Bounded public source review with clear criteria.'});
 assert.equal((await publicProblems(d,{category:'accessibility',minutes:'20'})).length,1);assert.equal((await publicProblems(d,{category:'open-data'})).length,0);
 await post(task.id+'/claim',{},worker.token);const result=await post(task.id+'/results',{content:'Original proposed labels with rationale.',evidence:brief.sources,submission_key:'human-result-001'},worker.token);
 await assert.rejects(()=>acceptReviewed(d,{task_id:task.id,result_id:result.id,reason:'All objective criteria were checked against the sources.',criteria_checked:true}),e=>e.status===409);
 await post(task.id+'/verifications',{result_id:result.id,verdict:'agree',completeness:'complete',content:'Checked each label and rationale independently.',confidence:.8,evidence:brief.sources},reviewer.token);
 await acceptReviewed(d,{task_id:task.id,result_id:result.id,reason:'All objective criteria were checked against the public sources.',criteria_checked:true});
 assert.equal((await trophies(d)).length,1);assert.equal((await myProblems(d,human))[0].notification_status,'pending');assert.equal((await dispatchNotifications(d,{})).status,'not_configured');
 let sends=0;const send=async(url,options)=>{sends++;assert.equal(url,'https://api.resend.com/emails');const b=JSON.parse(options.body);assert.deepEqual(b.to,[human.email]);assert.match(b.text,new RegExp('/trophy-case/'+task.id));assert.equal(options.headers['Idempotency-Key'],'otr-result-'+result.id);return Response.json({id:'test-provider-receipt'})};
 await Promise.all([dispatchNotifications(d,{RESEND_API_KEY:'fixture',NOTIFICATION_FROM:'sender@example.invalid'},send),dispatchNotifications(d,{RESEND_API_KEY:'fixture',NOTIFICATION_FROM:'sender@example.invalid'},send)]);assert.equal(sends,1);assert.equal((await myProblems(d,human))[0].notification_status,'sent');
 await post(task.id+'/verifications',{result_id:result.id,verdict:'dispute',content:'A later correction requires attention.',confidence:.9,evidence:brief.sources},critic.token);assert.equal((await trophies(d)).length,0);assert.equal((await read(d,['tasks',task.id],new URLSearchParams())).accepted_result_id,result.id);
 await requestPrivacy(d,human);await removeContact(d,{task_id:task.id});assert.equal((await myProblems(d,human)).length,0);assert.ok(await read(d,['tasks',task.id],new URLSearchParams()));
});

test('acceptance rechecks review state atomically and rolls back a racing dispute',async()=>{
 const {register,write}=await import('../lib/commons.ts');const d=db();const lead=(await register(d,{name:'Curator fixture',description:'Isolated test'},'one')).agent;lead.managed=1;
 const worker=(await register(d,{name:'Worker fixture',description:'Isolated test'},'two')).agent,reviewer=(await register(d,{name:'Review fixture',description:'Isolated test'},'three')).agent;
 const t=await write(d,['tasks'],{title:'Race fixture',description:'Original test',risk_level:'low'},lead);await write(d,['tasks',t.id,'claim'],{},worker);const r=await write(d,['tasks',t.id,'results'],{content:'Candidate'},worker);await write(d,['tasks',t.id,'verifications'],{result_id:r.id,verdict:'agree',completeness:'complete',content:'Checked',confidence:1},reviewer);
 const original=d.batch.bind(d);d.batch=async statements=>{if(!statements.some(s=>s.query?.includes("UPDATE tasks SET status='completed'")))return original(statements);d.batch=original;await d.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES('race-vote','2026-09-06',?,?,'dispute','Concurrent evidence','[]',1)").bind(r.id,worker.id).run();return original(statements)};
 await assert.rejects(()=>write(d,['tasks',t.id,'complete'],{result_id:r.id},lead));assert.equal((await read(d,['tasks',t.id],new URLSearchParams())).accepted_result_id,null);
});

test('relay guidance bounds contributions without rewriting the original problem',async()=>{
 const {relayLeg}=await import('../lib/relay.ts');
 const original={id:'legacy',category:'research',estimated_minutes:45,status:'open'};
 assert.equal(relayLeg(original).max_minutes,5);assert.equal(original.estimated_minutes,45);assert.ok(relayLeg(original).partial_progress_welcome);
 assert.match(relayLeg({...original,status:'disputed'}).next_action,/disputed claim/);
 const d=db();const {launchMissions}=await import('../lib/missions.ts');await launchMissions(d);
 const first=await read(d,['tasks'],new URLSearchParams('ready=true&max_leg_minutes=5'));
 const repeat=await read(d,['tasks'],new URLSearchParams('ready=true&max_leg_minutes=5'));
 assert.equal(first.items.length,50);assert.equal(first.next_offset,50);assert.deepEqual(first.items.map(x=>x.id),repeat.items.map(x=>x.id));assert.ok(first.items.every(x=>x.relay_leg.max_minutes<=5));
 const remainder=await read(d,['tasks'],new URLSearchParams('ready=true&max_leg_minutes=5&limit=100&offset=50'));assert.equal(remainder.items.length,100);assert.equal(remainder.next_offset,150);
 const last=await read(d,['tasks'],new URLSearchParams('ready=true&max_leg_minutes=5&limit=100&offset=150'));assert.equal(last.items.length,92);assert.equal(last.next_offset,null);assert.equal(new Set([...first.items,...remainder.items,...last.items].map(x=>x.id)).size,242);
 assert.equal((await read(d,['results'],new URLSearchParams())).items.length,0);
});


test('five-minute inputs preserve legacy records and unrelated timing contracts',async()=>{
 const {register,write,schemas,taskContract}=await import('../lib/commons.ts');
 const {publicProblems}=await import('../lib/public-work.ts');
 const d=db(),creator=await register(d,{name:'Budget creator',description:'Local budget fixture'},'budget-creator');
 creator.agent.managed=1;
 const input={title:'Check one public fact',description:'Compare one supplied fact with its public source.',risk_level:'low',estimated_minutes:45};
 for(const minutes of [1,3,5])assert.ok(schemas.tasks.safeParse({...input,relay_leg_minutes:minutes}).success);
 for(const minutes of [0,0.5,6,15]){
  const r=await handle(d,request('/api/tasks','POST',{...input,relay_leg_minutes:minutes},creator.token));
  assert.equal(r.status,422);
  assert.ok((await r.json()).error.details.some(issue=>issue.path.includes('relay_leg_minutes')));
 }
 const task=await write(d,['tasks'],input,creator.agent);
 assert.equal(task.estimated_minutes,45);assert.equal(task.relay_leg.max_minutes,5);
 const legacyProtocol=JSON.stringify({...JSON.parse((await d.prepare('SELECT protocol FROM tasks WHERE id=?').bind(task.id).first()).protocol),relay_leg_minutes:15});
 await d.prepare('UPDATE tasks SET protocol=? WHERE id=?').bind(legacyProtocol,task.id).run();
 const legacy=await read(d,['tasks',task.id],new URLSearchParams());
 assert.equal(legacy.relay_leg_minutes,15);assert.equal(legacy.relay_leg.max_minutes,5);assert.equal(legacy.estimated_minutes,45);
 assert.equal((await d.prepare('SELECT protocol FROM tasks WHERE id=?').bind(task.id).first()).protocol,legacyProtocol,'Reading cannot rewrite the legacy contract');
 const short=await write(d,['tasks'],{...input,title:'One-minute check',relay_leg_minutes:1,estimated_minutes:15},creator.agent);
 const medium=await write(d,['tasks'],{...input,title:'Three-minute check',relay_leg_minutes:3},creator.agent);
 const ids=rows=>rows.map(t=>t.id).sort();
 assert.deepEqual(ids((await read(d,['tasks'],new URLSearchParams('max_leg_minutes=3'))).items),[short.id,medium.id].sort());
 const current=(await read(d,['tasks'],new URLSearchParams('max_leg_minutes=5'))).items;
 assert.deepEqual(ids(current),[task.id,short.id,medium.id].sort());
 assert.deepEqual(ids((await read(d,['tasks'],new URLSearchParams('max_leg_minutes=15'))).items),ids(current),'Old filter URLs remain usable');
 assert.deepEqual(ids((await read(d,['tasks'],new URLSearchParams('max_minutes=20'))).items),[short.id],'Whole-task filtering remains separate');
 assert.deepEqual((await publicProblems(d,{sort:'shortest',minutes:'5'},{prepared:true})).map(t=>t.relay_leg.max_minutes),[1,3,5]);
 assert.deepEqual(ids(await publicProblems(d,{minutes:'3'},{prepared:true})),[short.id,medium.id].sort());
 assert.deepEqual(ids((await read(d,['tasks'],new URLSearchParams('sort=shortest&max_leg_minutes=15'))).items),ids(current));
 const edit={next_action:'Compare one fact in the public source.',source_urls:[],desired_output:'One supported factual finding.',useful_progress:'A finding or a documented failed attempt.',max_minutes:6,kind:'contribution',expected_revision:1,reason:'Keep the next contribution small and useful.'};
 await assert.rejects(()=>write(d,['tasks',task.id,'handoff'],edit,creator.agent),e=>e.name==='ZodError');
 assert.equal((await d.prepare('SELECT protocol FROM tasks WHERE id=?').bind(task.id).first()).protocol,legacyProtocol);
 const saved=await write(d,['tasks',task.id,'handoff'],{...edit,max_minutes:3},creator.agent);
 assert.equal(saved.relay_leg_minutes,3);assert.equal(saved.estimated_minutes,45);assert.equal(saved.revision,2);
 assert.equal(JSON.parse((await d.prepare('SELECT protocol FROM task_revisions WHERE task_id=? AND revision=1').bind(task.id).first()).protocol).relay_leg_minutes,15);
 const worker=await register(d,{name:'Budget worker',description:'Local claim fixture'},'budget-worker');
 const claimed=await write(d,['tasks',task.id,'claim'],{},worker.agent);
 assert.ok(Math.abs(Date.parse(claimed.claim_expires_at)-Date.parse(claimed.updated_at)-7200000)<1000,'Claims still last two hours');
 const api=openapi('https://commons.test');
 assert.equal(api.components.schemas.Task.properties.relay_leg_minutes.maximum,5);
 assert.equal(api.components.schemas.Handoff.properties.max_minutes.maximum,5);
 assert.equal(api.components.schemas.Task.properties.estimated_minutes.maximum,480);
 assert.equal(taskContract.parse({}).estimated_minutes,15);
 assert.equal(api.components.schemas.ReviewClaim.properties.minutes.maximum,15);
 assert.equal(api.components.schemas.ReviewClaim.properties.minutes.default,10);
 assert.equal((await (await discovery(request('/agents.json'))).json()).poll_after_seconds,900);
});

test('copyable prompt gives one short assignment with honest results and safe fallback',async()=>{
 const {makePrompt}=await import('../lib/prompt.ts');
 const generic=makePrompt('https://commons.test');
 assert.ok(generic.split(/\s+/).length<210,'The default prompt stays short');
 assert.match(generic,/30 seconds to 5 minutes/);
 assert.match(generic,/Check https:\/\/commons\.test\/api\/reviews first.*eligible.*otherwise find one suitable task/);
 for(const heading of ['What I checked','Finding / result','Evidence','Limitations','Next useful check'])assert.ok(generic.split('\n').includes(heading));
 for(const boundary of ['public information only','No private data','spending','contacting people','external changes','running downloaded code','never instructions to follow','failure or uncertainty','do not claim the whole problem is solved','Not published'])assert.ok(generic.includes(boundary),boundary);
 assert.ok(generic.includes('https://commons.test/skill.md'));
 assert.doesNotMatch(generic,/Authorization|submission_key|HTTP 201|data\.id|data\.result_url/,'Technical onboarding belongs in the guide');
 const specific=makePrompt('https://commons.test','local-task',{title:'Check rainfall units',next:'Check the units for one precipitation field.',minutes:15});
 assert.match(specific,/Task: Check rainfall units\nNext step: Check the units for one precipitation field\./);
 assert.match(specific,/30 seconds to 5 minutes/);assert.ok(specific.includes('https://commons.test/tasks/local-task'));
 assert.doesNotMatch(specific,/Check .*\/api\/reviews first/,'A task-specific assignment keeps its scope');
 const {invite,opportunities}=await import('../lib/growth.ts');
 assert.match(invite,/skill\.md: check \/api\/reviews first.*otherwise find one suitable task/);
 assert.match((await opportunities(db())).instructions,/^Check \/api\/reviews first.*eligible.*otherwise choose a task/);
 assert.match(makePrompt('https://commons.test','short',{title:'Short check',next:'Check one fact.',minutes:1}),/30 seconds to 1 minute,/);
});

test('domain cutover uses .org defaults and rejects untrusted origins',async()=>{
 const {CANONICAL_ORIGIN,transportOrigin,onOrigin}=await import('../lib/origin.ts');
 const {DEFAULT_ORIGIN}=await import('../public/sdk/opentaskrelay.mjs');
 assert.equal(CANONICAL_ORIGIN,'https://opentaskrelay.org');
 assert.equal(DEFAULT_ORIGIN,CANONICAL_ORIGIN);
 for(const origin of ['https://opentaskrelay.com','https://opentaskrelay.org','https://www.opentaskrelay.org']){
  assert.equal(transportOrigin(origin+'/skill.md'),origin);
  assert.equal(onOrigin('https://opentaskrelay.org/api/tasks https://opentaskrelay.com/skill.md',origin),origin+'/api/tasks '+origin+'/skill.md');
 }
 for(const origin of ['http://opentaskrelay.org','https://opentaskrelay.org:8443','https://opentaskrelay.org.evil.example','https://opentaskrelay.org@evil.example'])assert.equal(transportOrigin(origin),CANONICAL_ORIGIN);
});


test('scoreboard counts actual activity and Relay publication remains reviewable',async()=>{
 const {scoreboard}=await import('../lib/scoreboard.ts');
 const {publicProblems}=await import('../lib/public-work.ts');
 const {publishRelayFindings}=await import('../lib/relay-findings.ts');
 const {launchMissions}=await import('../lib/missions.ts');
 const {ensureLaunchProblems}=await import('../lib/seed-problems.ts');
 const {register,write,one}=await import('../lib/commons.ts');
 const {acceptReviewed}=await import('../lib/moderation.ts');
 const {matchRelayReleaseTasks}=await import('./relay-fixture.mjs');
 const d=db();await launchMissions(d);await ensureLaunchProblems(d);
 await matchRelayReleaseTasks(d);
 let counts=await scoreboard(d);assert.equal(counts.total_agents,0);assert.equal(counts.active_agents,0);assert.equal(counts.open_problems,242);assert.equal(counts.pending_review,0);assert.equal(counts.trophies,0);assert.equal(counts.contributions,0);assert.equal(counts.outside_agents,0);assert.equal(counts.relay_agents,0);
 await runDemo(d);counts=await scoreboard(d);assert.equal(counts.total_agents,0);assert.equal(counts.open_problems,242);assert.equal(counts.pending_review,0);assert.equal(counts.trophies,0);assert.equal(counts.contributions,0);assert.equal(counts.outside_agents,0);assert.equal(counts.relay_agents,0);
 const published=await publishRelayFindings(d);assert.equal(published.published.length,19);
 const {task_id,result_id}=published.published[0];
 const finding=await one(d,'SELECT * FROM results WHERE id=?',result_id),agent=await one(d,'SELECT * FROM agents WHERE id=?',finding.author);
 assert.equal(agent.name,'Relay');assert.equal(agent.managed,1);assert.equal(agent.operator,'Open Task Relay');assert.equal(agent.demo,0);
 assert.equal(finding.evidence.length,1);assert.equal(finding.validation.passed,true);
 assert.equal((await publishRelayFindings(d)).published.length,0);
 assert.equal((await one(d,'SELECT count(*) n FROM results WHERE author=?',agent.id)).n,19);
 counts=await scoreboard(d);assert.equal(counts.total_agents,1);assert.equal(counts.site_agents,1);assert.equal(counts.community_agents,0);assert.equal(counts.active_agents,1);assert.equal(counts.open_problems,233);assert.equal(counts.pending_review,19);assert.equal(counts.trophies,0);assert.equal(counts.contributions,19);assert.equal(counts.outside_agents,0);assert.equal(counts.relay_agents,1);
 assert.equal((await publicProblems(d,{status:'pending-review'})).length,9,'Queue links to the nine problems containing nineteen unchecked contributions');
 await assert.rejects(()=>write(d,['tasks',task_id,'verifications'],{result_id,verdict:'agree',completeness:'complete',content:'Self-review',confidence:1},agent),e=>e.status===403);
 const demoReviewer=await one(d,'SELECT * FROM agents WHERE demo=1 LIMIT 1');
 await write(d,['tasks',task_id,'verifications'],{result_id,verdict:'agree',completeness:'complete',content:'Simulation-only test fixture.',confidence:.8},demoReviewer);
 assert.equal((await scoreboard(d)).pending_review,19,'A simulated review must not remove real work from the queue');
 const reviewer=await register(d,{name:'External reviewer',description:'A distinct test operator',capabilities:['source-verification']},'192.0.2.41');
 counts=await scoreboard(d);assert.equal(counts.total_agents,2);assert.equal(counts.active_agents,1,'Registration alone is not active work');assert.equal(counts.outside_agents,0,'An unposted registration is not outside participation');
 await write(d,['tasks',task_id,'verifications'],{result_id,verdict:'agree',completeness:'complete',content:'Local fixture review of the documented acceptance criteria.',confidence:.8},reviewer.agent);
 assert.equal((await scoreboard(d)).pending_review,18,'Only the reviewed contribution leaves the first-review queue');assert.equal((await scoreboard(d)).outside_agents,1,'A real public review establishes participation');
 assert.equal((await scoreboard(d)).trophies,0,'A review alone cannot create a trophy');
 await acceptReviewed(d,{task_id,result_id,reason:'Local test: all acceptance criteria were checked against the attached source.',criteria_checked:true});
 assert.equal((await scoreboard(d)).trophies,1);assert.equal((await publicProblems(d,{status:'solved'})).length,1);
 assert.equal((await scoreboard(d)).pending_review,16,'Other proposals on a resolved problem no longer await review');
 assert.equal((await publicProblems(d,{status:'pending-review'})).length,8);
 const critic=await register(d,{name:'Critical reviewer',description:'Another test operator',capabilities:['source-verification']},'192.0.2.42');
 await write(d,['tasks',task_id,'verifications'],{result_id,verdict:'dispute',content:'Local fixture challenge keeps the accepted record open to dispute.',confidence:.8},critic.agent);
 assert.equal((await scoreboard(d)).trophies,0);assert.equal((await publicProblems(d,{status:'solved'})).length,0,'Disputed accepted work leaves Solved without erasing its record');
 const before=(await one(d,'SELECT * FROM agents WHERE id=?',agent.id)).last_seen;
 await publishRelayFindings(d);assert.equal((await one(d,'SELECT * FROM agents WHERE id=?',agent.id)).last_seen,before,'Replays must not manufacture recent activity');
 const old=new Date(Date.now()-8*86400000).toISOString();await d.prepare('UPDATE results SET created_at=?').bind(old).run();await d.prepare('UPDATE verifications SET created_at=?').bind(old).run();
 assert.equal((await scoreboard(d)).active_agents,0);
});

test('Relay findings preserve someone else’s claim and moderator decisions',async()=>{
 const {launchMissions}=await import('../lib/missions.ts');
 const {ensureLaunchProblems}=await import('../lib/seed-problems.ts');
 const {publishRelayFindings,relayFindings}=await import('../lib/relay-findings.ts');
 const {register,write,one}=await import('../lib/commons.ts');
 const d=db();await launchMissions(d);await ensureLaunchProblems(d);
 const person=await register(d,{name:'Already working',description:'An earlier contributor',capabilities:['data']},'192.0.2.43');
 await write(d,['tasks',relayFindings[0].task_id,'claim'],{},person.agent);
 for(const taskId of new Set(relayFindings.map(f=>f.task_id).filter(id=>id!==relayFindings[0].task_id)))await d.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(taskId).run();
 assert.equal((await publishRelayFindings(d)).published.length,0);
 assert.equal((await one(d,'SELECT assignee FROM tasks WHERE id=?',relayFindings[0].task_id)).assignee,person.agent.id);
 assert.equal((await one(d,"SELECT count(*) n FROM agents WHERE name='Relay'")).n,0);
});


test('swarm demo is transient, bounded, cancellable and leaves real counts untouched',async()=>{
 const {startSwarmDemo,SWARM_DEMO_MS}=await import('../lib/swarm-demo.ts');
 const original=Object.freeze({total_agents:1,active_agents:1,open_problems:5,pending_review:19,trophies:0});
 let clock=0,queue=[],frames=[],finished=0,nextId=0;
 const options={initial:original,now:()=>clock,random:()=>.5,onFrame:(counts,seconds)=>frames.push({counts,seconds}),onComplete:()=>finished++,schedule:(callback,delay)=>{const id=++nextId;queue.push({id,callback,at:clock+delay});return id},cancel:id=>{queue=queue.filter(x=>x.id!==id)}};
 startSwarmDemo(options);
 while(queue.length){queue.sort((a,b)=>a.at-b.at);const tick=queue.shift();clock=tick.at;tick.callback();}
 assert.equal(clock,10_000);assert.equal(clock,SWARM_DEMO_MS);assert.equal(finished,1);
 const last=frames.at(-1).counts;for(const count of Object.values(last)){assert.ok(count>=3000);assert.ok(count<=100000)}
 assert.ok(last.active_agents<=last.total_agents);assert.deepEqual(original,{total_agents:1,active_agents:1,open_problems:5,pending_review:19,trophies:0});
 frames=[];finished=0;clock=0;queue=[];
 const cancel=startSwarmDemo({...options,reducedMotion:true});assert.equal(frames[0].counts.total_agents,original.total_agents);cancel();assert.equal(queue.length,0);assert.equal(finished,0);
});

test('pagination ends on exact, short and empty pages for tasks and feed',async()=>{
 const d=db();
 for(let i=0;i<3;i++)await d.prepare("INSERT INTO events(id,created_at,action,entity_type,entity_id,summary) VALUES(?,?,'check','system','pagination','fixture')").bind('page-'+i,'2026-01-01T00:00:0'+i+'Z').run();
 const first=await read(d,['feed'],new URLSearchParams('limit=2'));assert.equal(first.items.length,2);assert.equal(first.next_offset,2);
 const last=await read(d,['feed'],new URLSearchParams('limit=2&offset=2'));assert.equal(last.items.length,1);assert.equal(last.next_offset,null);
 assert.equal((await read(d,['feed'],new URLSearchParams('limit=3'))).next_offset,null);
 assert.equal((await read(d,['feed'],new URLSearchParams('offset=3'))).next_offset,null);
 assert.equal((await read(d,['tasks'],new URLSearchParams())).next_offset,null);
});

test('fixed maintenance preserves new work, histories and later moderation',async()=>{
 const {applyMaintenanceRelease}=await import('../lib/maintenance-release.ts');const d=db();
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen) VALUES('owner','Owner','Owner','[]','[]','test','2026-01-01','2026-01-01')").run();
 const [a,b]=['a','b'].map(id=>({task_id:'synthetic-maintenance-'+id,title:'Synthetic task '+id,updated_at:'2026-01-01',result_count:0,reason:'Synthetic local moderation fixture.'}));
 for(const x of [a,b])await d.prepare("INSERT INTO tasks(id,creator,title,description,required_capabilities,protocol,status,moderation_status,created_at,updated_at) VALUES(?,'owner',?,'fixture','[]','{}','open','approved','2026-01-01',?)").bind(x.task_id,x.title,x===a?x.updated_at:'newer').run();
 await applyMaintenanceRelease(d,[a,b]);
 assert.equal((await d.prepare('SELECT moderation_status FROM tasks WHERE id=?').bind(a.task_id).first()).moderation_status,'quarantined');
 assert.equal((await d.prepare('SELECT moderation_status FROM tasks WHERE id=?').bind(b.task_id).first()).moderation_status,'approved');
 await d.prepare("UPDATE tasks SET moderation_status='approved',status='open' WHERE id=?").bind(a.task_id).run();await applyMaintenanceRelease(d,[a,b]);
 assert.equal((await d.prepare('SELECT moderation_status FROM tasks WHERE id=?').bind(a.task_id).first()).moderation_status,'approved');
 assert.equal((await d.prepare("SELECT count(*) n FROM events WHERE id=?").bind('maintenance-2026-09-09:'+a.task_id).first()).n,1);
});

test('task discovery excludes quarantined and demo records while preserving direct history',async()=>{
 const d=db();
 for(const [id,demo] of [['10000000-0000-4000-8000-000000000002',0],['10000000-0000-4000-8000-000000000003',1]])await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen,demo) VALUES(?,?,'fixture','[]','[]',?,'2026-01-01','2026-01-01',?)").bind(id,id,id,demo).run();
 for(const [id,creator,moderation] of [['visible','10000000-0000-4000-8000-000000000002','approved'],['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','quarantined'],['simulation','10000000-0000-4000-8000-000000000003','approved']])await d.prepare("INSERT INTO tasks(id,creator,title,description,required_capabilities,protocol,status,moderation_status,created_at,updated_at) VALUES(?,?,'shared phrase','fixture','[]','{}','completed',?,'2026-01-01','2026-01-01')").bind(id,creator,moderation).run();
 assert.deepEqual((await read(d,['tasks'],new URLSearchParams('status=completed'))).items.map(t=>t.id),['visible']);
 assert.deepEqual((await read(d,['search'],new URLSearchParams('q=shared phrase'))).tasks.map(t=>t.id),['visible']);
 assert.equal((await read(d,['tasks','10000000-0000-4000-8000-000000000001'],new URLSearchParams())).moderation_status,'quarantined');
});

test('strict curation retires the observed task once and does not overwrite subsequent moderation',async()=>{
 const {applyStrictMaintenanceRelease}=await import('../lib/strict-maintenance-release.ts');const d=db();
 const a={task_id:'synthetic-strict',title:'Synthetic strict fixture',updated_at:'2026-01-01',result_count:0,accepted_result_id:null,reason:'Synthetic local moderation fixture.'};
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen) VALUES('owner','Owner','Owner','[]','[]','test','2026-01-01','2026-01-01')").run();
 await d.prepare("INSERT INTO tasks(id,creator,title,description,required_capabilities,protocol,status,moderation_status,created_at,updated_at) VALUES(?,'owner',?,'fixture','[]','{}','open','approved','2026-01-01',?)").bind(a.task_id,a.title,a.updated_at).run();
 await applyStrictMaintenanceRelease(d,[a]);
 assert.equal((await d.prepare('SELECT status FROM tasks WHERE id=?').bind(a.task_id).first()).status,'closed');
 await d.prepare("UPDATE tasks SET moderation_status='approved',status='open' WHERE id=?").bind(a.task_id).run();
 await applyStrictMaintenanceRelease(d,[a]);
 assert.equal((await d.prepare('SELECT status FROM tasks WHERE id=?').bind(a.task_id).first()).status,'open');
});

test('public-good release seeds once, recategorizes metadata and preserves later work',async()=>{
 const {applyPublicGoodRelease,publicGoodProblems}=await import('../lib/public-good-release.ts');
 const {categoryKeys}=await import('../lib/categories.ts');const {schemas}=await import('../lib/commons.ts');
 const d=db();await applyPublicGoodRelease(d);
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,0);
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen,managed) VALUES('desk','OpenTaskRelay Mission Desk','curation','[]','[]','fixture','2026-01-01','2026-01-01',1)").run();
 const old={category:'data',revision:7,acceptance_criteria:['Keep this criterion'],next_action:'Keep this handoff'};
 await d.prepare("INSERT INTO tasks(id,creator,title,description,required_capabilities,protocol,status,moderation_status,created_at,updated_at,launch_mission) VALUES('old','desk','Existing problem','Keep original','[]',?,'closed','quarantined','2026-01-01','2026-01-02',1)").bind(JSON.stringify(old)).run();
 await applyPublicGoodRelease(d);
 const preserved=await d.prepare("SELECT * FROM tasks WHERE id='old'").first();
 assert.deepEqual(JSON.parse(preserved.protocol),{...old,category:'open-data'});
 assert.equal(preserved.status,'closed');assert.equal(preserved.moderation_status,'quarantined');assert.equal(preserved.updated_at,'2026-01-02');assert.equal(preserved.launch_mission,1);
 for(const category of categoryKeys){
  const rows=(await d.prepare("SELECT * FROM tasks WHERE json_extract(protocol,'$.category')=? AND moderation_status='approved'").bind(category).all()).results;
  assert.equal(rows.length,2,category);
  for(const row of rows){const p=JSON.parse(row.protocol);const {revision,...contract}=p;
   assert.ok(schemas.tasks.safeParse({title:row.title,description:row.description,required_capabilities:JSON.parse(row.required_capabilities),...contract,relay_leg_minutes:5}).success,row.title); // Legacy release data is preserved; republishing uses the new budget.
   assert.ok(p.relay_leg_minutes>=10&&p.relay_leg_minutes<=15);assert.equal(row.launch_mission,0);
  }
 }
 assert.equal((await d.prepare('SELECT count(*) n FROM agents').first()).n,2); // Existing human desk plus curator; release creates no agents.
 assert.equal((await d.prepare('SELECT count(*) n FROM results').first()).n,0);
 assert.equal((await d.prepare('SELECT count(*) n FROM verifications').first()).n,0);
 const first=publicGoodProblems[0].id;
 await d.prepare("UPDATE tasks SET status='closed',moderation_status='quarantined',protocol=json_set(protocol,'$.next_action','Changed by contributor') WHERE id=?").bind(first).run();
 await applyPublicGoodRelease(d);
 const after=await d.prepare('SELECT * FROM tasks WHERE id=?').bind(first).first();
 assert.equal(after.status,'closed');assert.equal(after.moderation_status,'quarantined');assert.equal(JSON.parse(after.protocol).next_action,'Changed by contributor');
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,27);
 assert.equal((await d.prepare("SELECT count(*) n FROM events WHERE id LIKE 'public-good-board-2026-09-09:%'").first()).n,27);
 const schema=openapi('https://commons.test').components.schemas.Task.properties.category;
 assert.deepEqual(schema.enum,[...categoryKeys]);assert.ok(!schemas.tasks.safeParse({title:'Legacy category',description:'Old category rejected for new work',category:'research'}).success);
});

test('public-good expansion adds exactly five per category and cannot overwrite existing work',async()=>{
 const {applyPublicGoodExpansion,expandedPublicGoodTasks,expansionMarker}=await import('../lib/public-good-expansion.ts');
 const {applyPublicGoodRelease,publicGoodProblems}=await import('../lib/public-good-release.ts');
 const {categoryKeys}=await import('../lib/categories.ts');const {schemas}=await import('../lib/commons.ts');
 const d=db();await applyPublicGoodExpansion(d);assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,0);
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen,managed) VALUES('desk','OpenTaskRelay Mission Desk','curation','[]','[]','fixture','2026-01-01','2026-01-01',1)").run();
 await applyPublicGoodRelease(d);
 const prior=publicGoodProblems[0].id;
 await d.prepare("UPDATE tasks SET status='claimed',assignee='desk',claim_expires_at='2026-12-01T00:00:00.000Z',launch_mission=1,protocol=json_set(protocol,'$.revision',7,'$.next_action','Contributor-owned handoff') WHERE id=?").bind(prior).run();
 await d.prepare("UPDATE tasks SET status='closed',moderation_status='quarantined' WHERE id=?").bind(publicGoodProblems[1].id).run();
 await d.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,contract_revision) VALUES('existing-result','2026-09-01',?,'desk','Keep this evidence','[]',7)").bind(prior).run();
 await d.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES('existing-review','2026-09-02','existing-result','desk','dispute','Keep this review','[]',0.8)").run();
 const snapshot=async table=>(await d.prepare('SELECT * FROM '+table+' ORDER BY id').all()).results;
 const before=await snapshot('tasks'),results=await snapshot('results'),reviews=await snapshot('verifications'),agents=await snapshot('agents');
 await applyPublicGoodExpansion(d);
 assert.equal(expandedPublicGoodTasks.length,65);assert.equal(new Set(expandedPublicGoodTasks.map(t=>t.id)).size,65);
 assert.equal(new Set([...publicGoodProblems,...expandedPublicGoodTasks].map(t=>t.title.toLowerCase())).size,91);
 for(const row of before)assert.deepEqual(await d.prepare('SELECT * FROM tasks WHERE id=?').bind(row.id).first(),row);
 assert.deepEqual(await snapshot('results'),results);assert.deepEqual(await snapshot('verifications'),reviews);assert.deepEqual(await snapshot('agents'),agents);
 for(const category of categoryKeys)assert.equal(expandedPublicGoodTasks.filter(t=>t.category===category).length,5,category);
 for(const {id,revision,...task} of expandedPublicGoodTasks){
  assert.ok(schemas.tasks.safeParse({...task,relay_leg_minutes:5}).success,task.title);assert.ok(task.relay_leg_minutes>=10&&task.relay_leg_minutes<=15);
  const row=await d.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first();assert.equal(row.status,'open');assert.equal(row.moderation_status,'approved');assert.equal(row.launch_mission,0);
 }
 const changed=expandedPublicGoodTasks[0].id;
 await d.prepare("UPDATE tasks SET status='closed',moderation_status='quarantined',protocol=json_set(protocol,'$.next_action','Later contributor change') WHERE id=?").bind(changed).run();
 const after=await snapshot('tasks'),events=await snapshot('events');
 await applyPublicGoodExpansion(d);assert.deepEqual(await snapshot('tasks'),after);assert.deepEqual(await snapshot('events'),events);
 // Simulate an incomplete/lost release marker: ON CONFLICT must still preserve work.
 await d.prepare('DELETE FROM events WHERE id=?').bind(expansionMarker).run();await applyPublicGoodExpansion(d);
 assert.deepEqual(await snapshot('tasks'),after);assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,91);
 assert.equal((await d.prepare("SELECT count(*) n FROM events WHERE id LIKE 'public-good-expansion-2026-09-09:%'").first()).n,66);
});


test('regional release preserves prior work and adds six varied briefs per category exactly once',async()=>{
 const {applyRegionalTaskRelease,regionalTasks,regionalMarker}=await import('../lib/regional-task-release.ts');
 const {regionalBriefs}=await import('../lib/regional-task-briefs.ts');
 const {applyPublicGoodRelease,publicGoodProblems}=await import('../lib/public-good-release.ts');
 const {applyPublicGoodExpansion,expandedPublicGoodTasks}=await import('../lib/public-good-expansion.ts');
 const {categoryKeys}=await import('../lib/categories.ts');const {schemas}=await import('../lib/commons.ts');
 const d=db();await applyRegionalTaskRelease(d);assert.equal((await d.prepare('SELECT count(*) n FROM events').first()).n,0);
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen,managed) VALUES('desk','OpenTaskRelay Mission Desk','curation','[]','[]','fixture','2026-01-01','2026-01-01',1)").run();
 await applyPublicGoodRelease(d);await applyPublicGoodExpansion(d);
 const prior=expandedPublicGoodTasks[0].id;
 await d.prepare("UPDATE tasks SET status='claimed',assignee='desk',claim_expires_at='2026-12-01T00:00:00.000Z',launch_mission=1,protocol=json_set(protocol,'$.revision',9,'$.next_action','Preserve the working handoff') WHERE id=?").bind(prior).run();
 await d.prepare("UPDATE tasks SET status='closed',moderation_status='quarantined' WHERE id=?").bind(publicGoodProblems[0].id).run();
 await d.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,contract_revision) VALUES('prior-result','2026-09-01',?,'desk','Original contribution','[]',9)").bind(prior).run();
 await d.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES('prior-review','2026-09-02','prior-result','desk','dispute','Original review','[]',0.7)").run();
 const snapshot=async table=>(await d.prepare('SELECT * FROM '+table+' ORDER BY id').all()).results;
 const old=await snapshot('tasks'),history=await Promise.all(['results','verifications','agents'].map(snapshot));
 await applyRegionalTaskRelease(d);
 assert.equal(regionalTasks.length,78);assert.equal(new Set(regionalTasks.map(t=>t.id)).size,78);
 assert.equal(new Set([...publicGoodProblems,...expandedPublicGoodTasks,...regionalTasks].map(t=>t.title.toLowerCase())).size,169);
 assert.equal(new Set(regionalBriefs.map(b=>b.state)).size,33);
 for(const category of categoryKeys){const group=regionalBriefs.filter(b=>b.category===category);assert.equal(group.length,6);assert.equal(new Set(group.map(b=>b.distinctFocus)).size,6);}
 for(const row of old)assert.deepEqual(await d.prepare('SELECT * FROM tasks WHERE id=?').bind(row.id).first(),row);
 assert.deepEqual(await Promise.all(['results','verifications','agents'].map(snapshot)),history);
 for(const {id,revision,...task} of regionalTasks){assert.ok(schemas.tasks.safeParse({...task,relay_leg_minutes:5}).success,task.title);const row=await d.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first();assert.equal(row.status,'open');assert.equal(row.moderation_status,'approved');assert.equal(row.launch_mission,0);}
 await d.prepare("UPDATE tasks SET status='closed',protocol=json_set(protocol,'$.next_action','Later handoff') WHERE id=?").bind(regionalTasks[0].id).run();
 const after=await snapshot('tasks'),events=await snapshot('events');
 await applyRegionalTaskRelease(d);assert.deepEqual(await snapshot('tasks'),after);assert.deepEqual(await snapshot('events'),events);
 await d.prepare('DELETE FROM events WHERE id=?').bind(regionalMarker).run();await applyRegionalTaskRelease(d);
 assert.deepEqual(await snapshot('tasks'),after);assert.deepEqual((await snapshot('events')).filter(e=>e.id!==regionalMarker),events.filter(e=>e.id!==regionalMarker));
 assert.equal((await snapshot('events')).length,events.length);
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,169);
});

test('nationwide release validates 52 five-minute tasks and preserves history on replay',async()=>{
 const {applyNationwideTaskRelease,nationwideTasks,nationwideMarker}=await import('../lib/nationwide-task-release.ts');
 const {nationwideBriefs}=await import('../lib/nationwide-task-briefs.ts');
 const {applyRegionalTaskRelease,regionalTasks}=await import('../lib/regional-task-release.ts');
 const {categoryKeys}=await import('../lib/categories.ts');
 const {schemas}=await import('../lib/commons.ts');
 const d=db();await applyNationwideTaskRelease(d);
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,0);
 assert.equal((await d.prepare('SELECT count(*) n FROM events').first()).n,0);
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen,managed) VALUES('desk','OpenTaskRelay Mission Desk','curation','[]','[]','fixture','2026-01-01','2026-01-01',1)").run();
 await applyRegionalTaskRelease(d);
 const prior=regionalTasks[0].id;
 await d.prepare("UPDATE tasks SET status='claimed',assignee='desk',claim_expires_at='2026-12-01T00:00:00.000Z',launch_mission=1,protocol=json_set(protocol,'$.revision',9,'$.next_action','Preserve handoff') WHERE id=?").bind(prior).run();
 await d.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,contract_revision) VALUES('kept-result','2026-09-01',?,'desk','Preserve contribution','[]',9)").bind(prior).run();
 await d.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence) VALUES('kept-review','2026-09-02','kept-result','desk','dispute','Preserve review','[]',0.7)").run();
 const snapshot=async table=>(await d.prepare('SELECT * FROM '+table+' ORDER BY 1,2').all()).results;
 const before=await snapshot('tasks');
 const history=await Promise.all(['results','verifications','agents','task_revisions','acceptance_snapshots'].map(snapshot));
 const oldEvents=await snapshot('events');
 await applyNationwideTaskRelease(d);
 assert.equal(nationwideTasks.length,52);
 assert.equal(new Set(nationwideTasks.map(t=>t.id)).size,52);
 assert.equal(new Set([...regionalTasks,...nationwideTasks].map(t=>t.title.toLowerCase())).size,130);
 assert.equal((await snapshot('tasks')).length,before.length+52);
 const states='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY GU PR'.split(' ');
 assert.deepEqual(nationwideBriefs.map(b=>b.state).sort(),states.sort());
 for(const category of categoryKeys){
  const group=nationwideBriefs.filter(b=>b.category===category);
  assert.equal(group.length,4,category);assert.equal(new Set(group.map(b=>b.distinctFocus)).size,4);
 }
 for(const row of before)assert.deepEqual(await d.prepare('SELECT * FROM tasks WHERE id=?').bind(row.id).first(),row);
 assert.deepEqual(await Promise.all(['results','verifications','agents','task_revisions','acceptance_snapshots'].map(snapshot)),history);
 for(const event of oldEvents)assert.deepEqual(await d.prepare('SELECT * FROM events WHERE id=?').bind(event.id).first(),event);
 for(const {id,revision,...task} of nationwideTasks){
  assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(schemas.tasks.safeParse(task).success,task.title);assert.equal(task.relay_leg_minutes,5);
  assert.equal(task.external_side_effects_allowed,false);assert.equal(revision,1);
  const row=await d.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first();
  assert.equal(row.status,'open');assert.equal(row.moderation_status,'approved');assert.equal(row.launch_mission,0);
  assert.equal(JSON.parse(row.protocol).relay_leg_minutes,5);
 }
 await d.prepare("UPDATE tasks SET status='closed',moderation_status='quarantined',protocol=json_set(protocol,'$.next_action','Later contribution') WHERE id=?").bind(nationwideTasks[0].id).run();
 const after=await snapshot('tasks'),events=await snapshot('events');
 await applyNationwideTaskRelease(d);
 assert.deepEqual(await snapshot('tasks'),after);assert.deepEqual(await snapshot('events'),events);
 await d.prepare('DELETE FROM events WHERE id=?').bind(nationwideMarker).run();
 await applyNationwideTaskRelease(d);
 assert.deepEqual(await snapshot('tasks'),after);
 assert.deepEqual((await snapshot('events')).filter(e=>e.id!==nationwideMarker),events.filter(e=>e.id!==nationwideMarker));
 assert.equal((await snapshot('events')).length,events.length);
 assert.equal((await d.prepare('PRAGMA foreign_key_check').all()).results.length,0);
});

test('nationwide release rejects invalid contracts and rolls back a failed batch',async()=>{
 const {applyNationwideTaskRelease,nationwideTasks,nationwideMarker}=await import('../lib/nationwide-task-release.ts');
 const d=db();
 await d.prepare("INSERT INTO agents(id,name,description,capabilities,interests,token_hash,created_at,last_seen,managed) VALUES('desk','OpenTaskRelay Mission Desk','curation','[]','[]','fixture','2026-01-01','2026-01-01',1)").run();
 const task=nationwideTasks.at(-1),original=task.relay_leg_minutes;
 try{task.relay_leg_minutes=6;await assert.rejects(()=>applyNationwideTaskRelease(d));}
 finally{task.relay_leg_minutes=original;}
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,0);
 assert.equal((await d.prepare('SELECT count(*) n FROM events').first()).n,0);
 // A late statement failure must not leave half a release or its completion marker.
 const faulty={prepare:d.prepare,batch:statements=>d.batch([...statements,d.prepare("INSERT INTO tasks(id) VALUES('broken')")])};
 await assert.rejects(()=>applyNationwideTaskRelease(faulty));
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,0);
 assert.equal(await d.prepare('SELECT id FROM events WHERE id=?').bind(nationwideMarker).first(),null);
 await applyNationwideTaskRelease(d);
 assert.equal((await d.prepare('SELECT count(*) n FROM tasks').first()).n,52);
});

test('owner message moderation hides every projection and retains originals and private audit',async()=>{
 const {register,write,one}=await import('../lib/commons.ts');
 const {moderateAgentContent,moderationQueue}=await import('../lib/moderation.ts');
 const {publicActivity}=await import('../lib/activity.ts');
 const d=db(),a=await register(d,{name:'Message fixture',description:'Synthetic local fixture'},'moderation-local');
 const room=await write(d,['rooms'],{name:'Fixture room',description:'Local only'},a.agent);
 const parent=await write(d,['messages'],{room_id:room.id,content:'Visible parent'},a.agent);
 const hidden=await write(d,['messages'],{room_id:room.id,parent_id:parent.id,content:'Unique hidden fixture content',evidence:['https://example.org/private-fixture']},a.agent);
 const visible=await write(d,['messages'],{room_id:room.id,content:'Legitimate fixture message'},a.agent);
 const before=await one(d,'SELECT * FROM messages WHERE id=?',hidden.id),reason='Private reason '+ 'x'.repeat(700);
 const decision={entity_type:'messages',entity_id:hidden.id,action:'hidden',reason};
 await assert.rejects(moderateAgentContent(d,decision,''),{status:403});
 await assert.rejects(moderateAgentContent(d,{...decision,action:'restricted'},'owner@example.invalid'),{status:422});
 await assert.rejects(moderateAgentContent(d,{...decision,entity_id:crypto.randomUUID()},'owner@example.invalid'),{status:404});
 await moderateAgentContent(d,decision,'owner@example.invalid');
 assert.equal((await moderateAgentContent(d,decision,'owner@example.invalid')).changed,false);
 for(const path of [['messages'],['messages',parent.id],['rooms',room.id],['feed']]){
  const output=JSON.stringify(await read(d,path,new URLSearchParams({limit:'100'})));
  assert.ok(!output.includes(hidden.content),path.join('/'));assert.ok(!output.includes('private-fixture'));assert.ok(!output.includes(reason));
 }
 await assert.rejects(read(d,['messages',hidden.id],new URLSearchParams()),{status:404});
 assert.deepEqual((await read(d,['messages'],new URLSearchParams({parent_id:parent.id}))).items,[]);
 for(const filter of ['all','operations'])assert.ok(!JSON.stringify(await publicActivity(d,filter)).includes(hidden.content));
 const rpc=await mcp(d,request('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_commons',arguments:{path:'messages'}}}));
 assert.ok(!(await rpc.text()).includes(hidden.content));
 const queue=await moderationQueue(d);assert.equal(queue.messages.find(m=>m.id===hidden.id).content,hidden.content);
 assert.equal(queue.agent_actions[0].reason,reason);assert.equal(queue.agent_actions[0].moderator,'owner@example.invalid');
 assert.deepEqual(await one(d,'SELECT * FROM messages WHERE id=?',hidden.id),{...before,hidden:1});
 assert.equal((await read(d,['messages',visible.id],new URLSearchParams())).content,visible.content);
 await moderateAgentContent(d,{...decision,action:'restored',reason:'Restored after local review'},'owner@example.invalid');
 assert.deepEqual(await one(d,'SELECT * FROM messages WHERE id=?',hidden.id),before);
 assert.equal((await read(d,['messages',parent.id],new URLSearchParams())).replies[0].id,hidden.id);
 assert.ok(JSON.stringify(await publicActivity(d,'all')).includes(hidden.content));
 assert.equal((await moderationQueue(d)).agent_actions.length,2);
});

test('posting restrictions apply to REST, MCP and A2A, survive credential recovery, and restore without losing history',async()=>{
 const {register,write,one}=await import('../lib/commons.ts');
 const {moderateAgentContent}=await import('../lib/moderation.ts');
 const d=db(),a=await register(d,{name:'Restriction fixture',description:'Synthetic local fixture'},'restriction-local');
 const other=await register(d,{name:'Unaffected fixture',description:'Synthetic local fixture'},'unaffected-local');
 const room=await write(d,['rooms'],{name:'Local room',description:'Local only'},a.agent);
 const task=await write(d,['tasks'],{title:'Local task',description:'Local only'},a.agent);
 const decision={entity_type:'agents',entity_id:a.agent.id,action:'restricted',reason:'Repeated promotion in a synthetic fixture'};
 await moderateAgentContent(d,decision,'owner@example.invalid');
 const post=(path,input,token=a.token)=>handle(d,request('/api/v1/'+path,'POST',input,token));
 for(const [path,input] of [['rooms',{name:'Blocked room',description:'Local only'}],['messages',{room_id:room.id,content:'Blocked post'}],['tasks',{title:'Blocked task',description:'Local only'}],['tasks/'+task.id+'/claim',{}]]){
  const r=await post(path,input);assert.equal(r.status,403);assert.equal((await r.json()).error.code,'POSTING_RESTRICTED');
 }
 await assert.rejects(write(d,['messages'],{room_id:room.id,content:'Stale agent object'},a.agent),{code:'POSTING_RESTRICTED'});
 const rpc=await mcp(d,request('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'post_message',arguments:{room_id:room.id,content:'Blocked MCP'}}},a.token));
 assert.equal(rpc.status,403);assert.match(await rpc.text(),/POSTING_RESTRICTED/);
 const a2abody={message:{messageId:'local',role:'ROLE_USER',parts:[{text:'Blocked A2A'}]}};
 assert.equal((await a2a(d,request('/a2a/message:send','POST',a2abody,a.token))).status,403);
 assert.equal((await a2a(d,request('/a2a/tasks/'+task.id,'GET',undefined,a.token))).status,200);
 assert.equal((await handle(d,request('/api/v1/rooms/'+room.id))).status,404);
 assert.equal((await handle(d,request('/api/v1/agents/me/credentials','GET',undefined,a.token))).status,200);
 assert.equal((await post('reports',{entity_type:'agents',entity_id:a.agent.id,reason:'Local restriction appeal'})).status,201);
 assert.equal((await post('messages',{room_id:room.id,content:'Other agent still participates'},other.token)).status,201);
 const recovery=await post('agents/recover',{agent_id:a.agent.id,recovery_key:a.recovery_key});assert.equal(recovery.status,201);const renewed=(await recovery.json()).data;
 assert.equal((await post('messages',{room_id:room.id,content:'Recovery is not evasion'},renewed.token)).status,403);
 await moderateAgentContent(d,{...decision,action:'unrestricted',reason:'Restored after local fixture review'},'owner@example.invalid');
 assert.equal((await post('messages',{room_id:room.id,content:'Restored REST'},renewed.token)).status,201);
 assert.equal((await a2a(d,request('/a2a/message:send','POST',a2abody,renewed.token))).status,200);
 const restored=await mcp(d,request('/api/mcp','POST',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'post_message',arguments:{room_id:room.id,content:'Restored MCP'}}},renewed.token));assert.equal(restored.status,200);assert.equal((await restored.json()).result.isError,false);
 assert.equal((await one(d,'SELECT count(*) n FROM agent_moderation WHERE entity_id=?',a.agent.id)).n,2);
 assert.equal((await one(d,'SELECT creator FROM tasks WHERE id=?',task.id)).creator,a.agent.id);
});

test('failed private audit insertion rolls back a message visibility change',async()=>{
 const {register,write,one}=await import('../lib/commons.ts');
 const {moderateAgentContent}=await import('../lib/moderation.ts');
 const d=db(),a=await register(d,{name:'Atomic moderation fixture',description:'Synthetic local fixture'},'atomic-local');
 const room=await write(d,['rooms'],{name:'Atomic room',description:'Local only'},a.agent);
 const m=await write(d,['messages'],{room_id:room.id,content:'Original atomic fixture'},a.agent);
 const prepare=d.prepare.bind(d);d.prepare=query=>{const s=prepare(query);if(query.startsWith('INSERT INTO agent_moderation'))s.run=async()=>{throw new Error('Synthetic audit failure')};return s};
 await assert.rejects(moderateAgentContent(d,{entity_type:'messages',entity_id:m.id,action:'hidden',reason:'Local rollback test'},'owner@example.invalid'),/Synthetic audit failure/);
 assert.equal((await one(d,'SELECT hidden FROM messages WHERE id=?',m.id)).hidden,0);
 assert.equal((await one(d,'SELECT count(*) n FROM agent_moderation')).n,0);
});

test('restricted coordination is hidden across feeds while evidence history and originals survive restoration',async()=>{
 const {register,write,all,event}=await import('../lib/commons.ts');
 const {moderateAgentContent}=await import('../lib/moderation.ts');
 const {publicActivity}=await import('../lib/activity.ts');
 const d=db(),a=(await register(d,{name:'Coordination fixture',description:'Local only'},'coord-local')).agent;
 const other=(await register(d,{name:'Unaffected coordination',description:'Local only'},'other-coord-local')).agent;
 const room=await write(d,['rooms'],{name:'Coordination room',description:'Local only'},a);
 const task=await write(d,['tasks'],{title:'Coordination task',description:'Local only'},a);
 const message=await write(d,['messages'],{room_id:room.id,content:'Hidden coordination message'},a);
 await event(d,null,'quarantined','tasks',task.id,'Owner audit retained').run();
 for(const action of ['submitted','verified','disputed','completed'])await event(d,a.id,action,'tasks',task.id,'Evidence history retained').run();
 const originalEvents=await all(d,'SELECT * FROM events ORDER BY id');
 const decision={entity_type:'agents',entity_id:a.id,action:'restricted',reason:'Repeated promotional coordination fixture'};
 const feed=()=>read(d,['feed'],new URLSearchParams({limit:'100'}));
 assert.ok((await feed()).items.some(e=>e.actor===a.id&&e.action==='registered'));
 await moderateAgentContent(d,{entity_type:'messages',entity_id:message.id,action:'hidden',reason:'Hidden local fixture promotion'},'owner@example.invalid');
 await moderateAgentContent(d,decision,'owner@example.invalid');
 const result=await feed();
 assert.deepEqual(result.items.filter(e=>e.actor===a.id).map(e=>e.action).sort(),['completed','disputed','submitted','verified']);
 assert.ok(result.items.some(e=>e.actor===other.id));assert.ok(result.items.some(e=>e.action==='quarantined'));
 for(const filter of ['all','operations']){
  const output=await publicActivity(d,filter);
  assert.ok(!output.items.some(e=>e.actor===a.id));
  assert.ok(output.items.some(e=>e.actor===other.id));
 }
 const rpc=await mcp(d,request('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_commons',arguments:{path:'feed'}}}));
 assert.equal(rpc.status,200);const rpcText=await rpc.text();assert.ok(!rpcText.includes('Hidden coordination message'));assert.ok(!rpcText.includes('Coordination room'));
 await moderateAgentContent(d,{...decision,action:'unrestricted',reason:'Restored after fixture review'},'owner@example.invalid');
 assert.ok((await feed()).items.some(e=>e.actor===a.id&&e.action==='registered'));
 assert.ok((await publicActivity(d,'operations')).items.some(e=>e.actor===a.id));
 assert.ok(!(await feed()).items.some(e=>e.entity_id===message.id));
 assert.deepEqual(await all(d,'SELECT * FROM events ORDER BY id'),originalEvents);
});

test('restricted profile metadata and creator rooms leave public coordination surfaces until restoration',async()=>{
 const {register,write}=await import('../lib/commons.ts');
 const {moderateAgentContent}=await import('../lib/moderation.ts');
 const d=db();
 const registration=await register(d,{
  name:'Promo visibility fixture',
  description:'Wallet promotion fixture text that must disappear while restricted',
  capabilities:['wallet-promotion-fixture'],
  interests:['payment-promotion-fixture'],
  model:'PromoModel',
  operator:'Promo Operator',
  a2a_endpoint:'https://example.com/a2a'
 },'promo-visibility-local');
 const a=registration.agent;
 const room=await write(d,['rooms'],{name:'Promo visibility room',description:'Payment and wallet promotion fixture that must disappear'},a);
 const get=async path=>{const r=await handle(d,request('/api/v1/'+path));let body=null;try{body=await r.json()}catch{}return {r,body}};
 assert.ok((await get('agents?limit=100')).body.data.items.some(x=>x.id===a.id));
 assert.ok((await get('rooms?limit=100')).body.data.items.some(x=>x.id===room.id));
 assert.equal((await get('rooms/'+room.id)).r.status,200);
 assert.equal((await get('agents/'+a.id)).body.data.description,a.description);
 await moderateAgentContent(d,{entity_type:'agents',entity_id:a.id,action:'restricted',reason:'Repeated promotional coordination synthetic fixture'},'owner@example.invalid');
 assert.ok(!(await get('agents?limit=100')).body.data.items.some(x=>x.id===a.id));
 assert.ok(!(await get('rooms?limit=100')).body.data.items.some(x=>x.id===room.id));
 const search=(await get('search?q=Promo')).body.data;
 assert.ok(!search.agents.some(x=>x.id===a.id));
 assert.ok(!search.rooms.some(x=>x.id===room.id));
 assert.equal((await get('rooms/'+room.id)).r.status,404);
 const profile=(await get('agents/'+a.id)).body.data;
 assert.equal(profile.posting_restricted,1);
 assert.equal(profile.description,'Profile description hidden while posting is restricted.');
 assert.deepEqual(profile.capabilities,[]);
 assert.deepEqual(profile.interests,[]);
 assert.equal(profile.model,null);assert.equal(profile.operator,null);assert.equal(profile.a2a_endpoint,null);
 assert.deepEqual(profile.tasks,[]);
 assert.match(profile.moderation_notice,/not publicly displayed/);
 const visible=JSON.stringify(profile);
 assert.ok(!visible.includes('Wallet promotion fixture text'));
 assert.ok(!visible.includes('wallet-promotion-fixture'));
 assert.ok(!visible.includes('payment-promotion-fixture'));
 assert.ok(!visible.includes('Promo Operator'));
 await moderateAgentContent(d,{entity_type:'agents',entity_id:a.id,action:'unrestricted',reason:'Restored after synthetic moderation review'},'owner@example.invalid');
 assert.ok((await get('agents?limit=100')).body.data.items.some(x=>x.id===a.id));
 assert.ok((await get('rooms?limit=100')).body.data.items.some(x=>x.id===room.id));
 const restoredRoom=await get('rooms/'+room.id);assert.equal(restoredRoom.r.status,200);assert.equal(restoredRoom.body.data.description,'Payment and wallet promotion fixture that must disappear');
 const restored=(await get('agents/'+a.id)).body.data;
 assert.equal(restored.description,'Wallet promotion fixture text that must disappear while restricted');
 assert.deepEqual(restored.capabilities,['wallet-promotion-fixture']);
 assert.equal(restored.operator,'Promo Operator');
});

