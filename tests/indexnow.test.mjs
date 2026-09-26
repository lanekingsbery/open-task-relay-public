import {createTaskFixture} from './task-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {write} from '../lib/commons.ts';
import {moderate} from '../lib/moderation.ts';
import {updateHandoff} from '../lib/task-edit.ts';
import {archiveTask} from '../lib/task-archive.ts';
import {withIndexNow,trackTaskChange,submitIndexNow,indexNowVerificationResponse} from '../lib/indexnow.ts';
const config={origin:'https://example.org',key:'synthetic-indexnow-key',keyLocation:'https://example.org/synthetic-indexnow-key.txt'};
test('ownership responses use the current key, reject retired paths and stay uncached',async()=>{
 const request=(url,method='GET')=>new Request(url,{method});
 const response=indexNowVerificationResponse(request(config.keyLocation),config);
 assert.equal(response.status,200);assert.equal(await response.text(),config.key);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const head=indexNowVerificationResponse(request(config.keyLocation,'HEAD'),config);
 assert.equal(head.status,200);assert.equal(await head.text(),'');
 for(const req of [request(config.origin+'/retired-synthetic-key.txt'),request('https://elsewhere.invalid/synthetic-indexnow-key.txt'),request(config.keyLocation,'POST')])assert.equal(indexNowVerificationResponse(req,config),null);
 assert.equal(indexNowVerificationResponse(request(config.keyLocation),null),null);
 const rotated={...config,key:'rotated-synthetic-key',keyLocation:config.origin+'/rotated-synthetic-key.txt'};
 assert.equal(indexNowVerificationResponse(request(config.keyLocation),rotated),null);
 assert.equal(await indexNowVerificationResponse(request(rotated.keyLocation),rotated).text(),rotated.key);
});
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 const db={prepare(s){let args=[];const stmt=sql.prepare(s);return {bind(...v){args=v;return this},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return stmt.run(...args)}}},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 const actor=(managed=1,demo=0)=>{const id=crypto.randomUUID();sql.prepare("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen,demo,managed) VALUES(?,?,?,?,?,?,?,?,?,?)").run(id,new Date().toISOString(),'Synthetic actor','Local fixture','[]','[]',crypto.randomUUID(),new Date().toISOString(),demo,managed);return {id,managed,demo}};
 return {db,sql,actor};
}
const brief={title:'Check synthetic public data',description:'Compare two example.org source totals and document discrepancies.',objective:'Identify differences',risk_level:'low',category:'open-data',difficulty:'easy',estimated_minutes:5,required_capabilities:[],expected_output:'A discrepancy and source',acceptance_criteria:['Document one comparison'],license:'CC0-1.0'};
async function request(work,{method='POST',origin=config.origin,settings=config,send}={}){
 const waits=[],calls=[];
 const transport=send||(async(url,options)=>{calls.push({url,options,payload:JSON.parse(options.body)});return new Response(null,{status:202})});
 const value=await withIndexNow(new Request(origin+'/api/tasks',{method}),{waitUntil(p){waits.push(p)}},settings,work,transport);
 await Promise.all(waits);return {value,calls,waits};
}

test('approved task creation batches exact canonical URLs; duplicate task changes coalesce',async()=>{
 const {db,actor,sql}=fixture();try{const owner=actor();let task;
 const r=await request(async()=>{task=await createTaskFixture(db,brief,owner);await moderate(db,{task_id:task.id,decision:'quarantined',reason:'Synthetic moderation change'});await moderate(db,{task_id:task.id,decision:'approved',reason:'Synthetic restored public task'});return task});
 assert.equal(r.calls.length,1);assert.deepEqual(r.calls[0].payload,{host:'example.org',key:config.key,keyLocation:config.keyLocation,urlList:['https://example.org/tasks/'+task.id]});
 assert.equal(r.calls[0].url,'https://api.indexnow.org/indexnow');assert.equal(r.calls[0].options.redirect,'manual');assert.ok(r.calls[0].options.signal);
 }finally{sql.close()}
});

test('pending/internal/demo tasks and repeated moderation do not notify; approval and removal do',async()=>{
 const {db,actor,sql}=fixture();try{
 const pending=await request(()=>createTaskFixture(db,brief,actor(0)));assert.equal(pending.calls.length,0);
 const demo=await request(()=>createTaskFixture(db,brief,actor(1,1)));assert.equal(demo.calls.length,0);
 const id=pending.value.id;
 const mod=decision=>request(()=>moderate(db,{task_id:id,decision,reason:'Synthetic moderation decision'}));
 assert.equal((await mod('quarantined')).calls.length,0);
 assert.equal((await mod('approved')).calls.length,1);
 assert.equal((await mod('approved')).calls.length,0);
 assert.equal((await mod('quarantined')).calls.length,1);
 assert.equal((await mod('quarantined')).calls.length,0);
 }finally{sql.close()}
});

test('public subtask creation submits child and changed parent together',async()=>{
 const {db,actor,sql}=fixture();try{const owner=actor(),parent=await createTaskFixture(db,brief,owner);
 const r=await request(()=>createTaskFixture(db,{...brief,parent_id:parent.id},owner));
 assert.equal(r.calls.length,1);assert.deepEqual(new Set(r.calls[0].payload.urlList),new Set([config.origin+'/tasks/'+parent.id,config.origin+'/tasks/'+r.value.id]));
 }finally{sql.close()}
});

test('handoff updates and archive notify through moderator entry points; repeat archive is silent',async()=>{
 const {db,actor,sql}=fixture();try{const task=await createTaskFixture(db,brief,actor());
 const handoff={next_action:'Check one synthetic source',source_urls:['https://example.org/data'],desired_output:'One documented discrepancy',useful_progress:'A checked example is enough',max_minutes:5,kind:'contribution',expected_revision:1,reason:'Clarify the next synthetic check'};
 assert.equal((await request(()=>updateHandoff(db,task.id,handoff,null))).calls.length,1);
 const archive={expected_revision:2,reason:'Synthetic task is no longer needed'};
 assert.equal((await request(()=>archiveTask(db,task.id,archive,null))).calls.length,1);
 assert.equal((await request(()=>archiveTask(db,task.id,archive,null))).calls.length,0);
 }finally{sql.close()}
});

test('claims are silent; results, reviews and acceptance notify; retried results are silent',async()=>{
 const {db,actor,sql}=fixture();try{const owner=actor(),worker=actor(0),reviewer=actor(0);const task=await createTaskFixture(db,brief,owner);
 assert.equal((await request(()=>write(db,['tasks',task.id,'claim'],{},worker))).calls.length,0);
 assert.equal((await request(()=>write(db,['tasks',task.id,'start'],{},worker))).calls.length,0);
 const submission={content:'Synthetic source comparison with a documented mismatch.',evidence:['https://example.org/data'],submission_key:crypto.randomUUID()};
 const result=await request(()=>write(db,['tasks',task.id,'results'],submission,worker));assert.equal(result.calls.length,1);
 assert.equal((await request(()=>write(db,['tasks',task.id,'results'],submission,worker))).calls.length,0);
 const review={result_id:result.value.id,verdict:'agree',completeness:'complete',content:'Independently checked the synthetic discrepancy.',confidence:0.8};
 assert.equal((await request(()=>write(db,['tasks',task.id,'verifications'],review,reviewer))).calls.length,1);
 assert.equal((await request(()=>write(db,['tasks',task.id,'complete'],{result_id:result.value.id},owner))).calls.length,1);
 }finally{sql.close()}
});

test('GET, foreign origin and unconfigured public exports never submit',async()=>{
 const {db,actor,sql}=fixture();try{const owner=actor();
 for(const options of [{method:'GET'},{origin:'https://staging.example.org'},{settings:null}])assert.equal((await request(()=>createTaskFixture(db,brief,owner),options)).calls.length,0);
 }finally{sql.close()}
});

test('failed writes, failed observation and no-op writes preserve product behavior',async()=>{
 const {db,actor,sql}=fixture();try{const task=await createTaskFixture(db,brief,actor());
 assert.equal((await request(()=>trackTaskChange(db,task.id,async()=>task))).calls.length,0);
 let saved=false;const broken={prepare(){throw new Error('Synthetic observation failure')}};
 const result=await request(()=>trackTaskChange(broken,task.id,async()=>{saved=true;return task}));assert.ok(saved);assert.equal(result.value,task);assert.equal(result.calls.length,0);
 let called=false;await assert.rejects(()=>request(()=>trackTaskChange(db,task.id,async()=>{throw new Error('Write rejected')}),{send:async()=>{called=true;return new Response()}}),/Write rejected/);assert.equal(called,false);
 }finally{sql.close()}
});

test('provider errors never fail successful writes and notification does not delay the response',async()=>{
 const {db,actor,sql}=fixture();try{const owner=actor();
 for(const send of [async()=>{throw new Error('Offline')},async()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.invalid'}}),async()=>new Response(null,{status:429}),async()=>new Response(null,{status:500})]){
 const r=await request(()=>createTaskFixture(db,brief,owner),{send});assert.ok(r.value.id);
 }
 const waits=[];let finish;const network=new Promise(resolve=>{finish=resolve});
 const saved=await withIndexNow(new Request(config.origin+'/mcp',{method:'POST'}),{waitUntil(p){waits.push(p)}},config,()=>createTaskFixture(db,brief,owner),async()=>network);
 assert.ok(saved.id);assert.equal(waits.length,1);finish(new Response(null,{status:200}));await Promise.all(waits);
 }finally{sql.close()}
});

test('invalid URLs never enter the payload; malformed configuration and empty batches are silent',async()=>{
 const calls=[];const send=async(url,options)=>{calls.push(JSON.parse(options.body));return new Response(null,{status:200})};const id=crypto.randomUUID();
 await submitIndexNow(config,[id,id,'https://private.invalid/secret','../moderation'],send);assert.deepEqual(calls[0].urlList,[config.origin+'/tasks/'+id]);
 await submitIndexNow(config,[],send);await submitIndexNow({...config,keyLocation:'https://elsewhere.invalid/key.txt'},[id],send);assert.equal(calls.length,1);
});
