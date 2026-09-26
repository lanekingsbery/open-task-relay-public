import {createTaskFixture} from './task-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {indexNowConfig} from '../lib/indexnow-config.ts';
const syntheticKey='synthetic-indexnow-runtime-key';

for(const enabled of [false,true])test('built Worker IndexNow boundary, self-hosted='+enabled,async()=>{
 const submissions=[];
 const mf=new Miniflare(convertV4MiniflareOptions({
  modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),
  modulesRoot:'dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],
  bindings:enabled?{RELAY_SELF_HOSTED:'true',INDEXNOW_KEY:syntheticKey}:{},
  serviceBindings:{ASSETS:async()=>new Response(null,{status:404})},
  outboundService:async request=>{assert.equal(request.url,'https://api.indexnow.org/indexnow');submissions.push(await request.json());return new Response(null,{status:202})}
 }));
 try{
  const config=indexNowConfig({INDEXNOW_KEY:syntheticKey});
  const file=await mf.dispatchFetch('https://opentaskrelay.org/'+syntheticKey+'.txt');
  assert.equal(file.status,enabled&&config?200:404);
  if(enabled&&config){assert.equal(await file.text(),syntheticKey);assert.equal(file.headers.get('cache-control'),'no-store');}
  const db=await mf.getD1Database('DB');
  for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const statement of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
  const post=async(path,data,token)=>{const r=await mf.dispatchFetch('https://opentaskrelay.org'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});assert.equal(r.status,201);return (await r.json()).data};
  const agent=await post('/api/v1/agents',{name:'Synthetic indexing fixture',description:'Local mocked notification check'});
  await db.prepare('UPDATE agents SET managed=1 WHERE id=?').bind(agent.agent.id).run();
  const denied=await mf.dispatchFetch('https://opentaskrelay.org/api/tasks',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+agent.token},body:JSON.stringify({title:'Rejected creation',description:'Local fixture'})});assert.equal(denied.status,410);assert.equal(submissions.length,0);assert.equal((await db.prepare('SELECT count(*) n FROM tasks').first()).n,0);
  const task=await createTaskFixture(db,{title:'Synthetic indexing test',description:'Only local fixture content.'},{...agent.agent,managed:1});
  await post('/api/tasks/'+task.id+'/claim',{},agent.token);await post('/api/tasks/'+task.id+'/results',{content:'Synthetic contribution'},agent.token);
  // Miniflare tracks waitUntil work; allow only this mocked outbound submission to settle.
  if(enabled&&config){for(let i=0;i<30&&!submissions.length;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(submissions.length,1);assert.deepEqual(submissions[0].urlList,['https://opentaskrelay.org/tasks/'+task.id]);assert.equal(submissions[0].key,syntheticKey);assert.equal(submissions[0].keyLocation,config.keyLocation);}
  else assert.equal(submissions.length,0);
 }finally{await mf.dispose()}
});
