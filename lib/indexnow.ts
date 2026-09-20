import {AsyncLocalStorage} from 'node:async_hooks';
import {timingSafeEqual} from 'node:crypto';
import type {DB} from './commons.ts';

export type IndexNowConfig={origin:string;key:string;keyLocation:string};
type Scope={tasks:Set<string>};
const changes=new AsyncLocalStorage<Scope>();
const taskId=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// Serve the ownership file from the same runtime secret used by submissions.
// No key-bearing asset filename or body enters Git or the build output.
export function indexNowVerificationResponse(request:Request,config:IndexNowConfig|null):Response|null {
 if(!config||!['GET','HEAD'].includes(request.method))return null;
 const url=new URL(request.url),location=new URL(config.keyLocation);
 if(url.origin!==config.origin||location.origin!==config.origin)return null;
 const actual=new TextEncoder().encode(url.pathname),expected=new TextEncoder().encode(location.pathname);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 return new Response(request.method==='HEAD'?null:config.key,{headers:{
  'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive',
  'Referrer-Policy':'no-referrer'
 }});
}

// Match sitemap eligibility; omit claim leases, timestamps and moderation notes.
// Content counts distinguish new results/reviews from idempotent retries.
async function snapshot(db:DB,id:string){
 const row=await db.prepare(`SELECT t.title,t.description,t.protocol,t.required_capabilities,
 t.status,t.accepted_result_id,
 (SELECT count(*) FROM results WHERE task_id=t.id) AS results,
 (SELECT count(*) FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id) AS reviews,
 (SELECT count(*) FROM tasks child JOIN agents a ON a.id=child.creator WHERE child.parent_id=t.id AND child.moderation_status='approved' AND a.demo=0) AS subtasks
 FROM tasks t JOIN agents a ON a.id=t.creator
 WHERE t.id=? AND t.moderation_status='approved' AND a.demo=0`).bind(id).first();
 return row?JSON.stringify(row):null;
}

export async function trackTaskChange<T>(db:DB,id:string|undefined,write:()=>Promise<T>):Promise<T>{
 const scope=changes.getStore();
 if(!scope)return write();
 let before:string|null=null,observed=true;
 try{if(id)before=await snapshot(db,id);}catch{observed=false;}
 const result=await write(); // Preserve the application's error/transaction behavior.
 try{
  const target=id||(result as {id?:string}|null)?.id;
  if(observed&&target&&taskId.test(target)){
   const after=await snapshot(db,target);
   if(before!==after&&(before!==null||after!==null))scope.tasks.add(target);
  }
 }catch{/* Indexing inspection must never turn a saved write into an error. */}
 return result;
}

export async function submitIndexNow(config:IndexNowConfig,ids:Iterable<string>,send:typeof fetch=fetch){
 try{
  const origin=new URL(config.origin),location=new URL(config.keyLocation);
  if(origin.protocol!=='https:'||origin.origin!==config.origin||location.origin!==origin.origin||
   !/^[a-zA-Z0-9-]{8,128}$/.test(config.key))return;
  const urls=[...new Set(ids)].filter(id=>taskId.test(id)).map(id=>origin.origin+'/tasks/'+id);
  if(!urls.length)return;
  const response=await send('https://api.indexnow.org/indexnow',{
   method:'POST',headers:{'Content-Type':'application/json'},redirect:'manual',
   signal:AbortSignal.timeout(5000),
   body:JSON.stringify({host:origin.host,key:config.key,keyLocation:location.href,urlList:urls.slice(0,10000)})
  });
  // Do not log keys, task content, or provider response bodies; no retry storm.
  if(response.status!==200&&response.status!==202)console.warn('indexnow_submission_failed',response.status);
  await response.body?.cancel();
 }catch{console.warn('indexnow_submission_unavailable');}
}

export async function withIndexNow<T>(request:Request,ctx:{waitUntil(p:Promise<unknown>):void},config:IndexNowConfig|null,render:()=>Promise<T>,send:typeof fetch=fetch):Promise<T>{
 if(!config||new URL(request.url).origin!==config.origin||!['POST','PUT','PATCH','DELETE'].includes(request.method))return render();
 const scope:Scope={tasks:new Set()};
 return changes.run(scope,async()=>{
  try{return await render();}
  finally{if(scope.tasks.size){try{ctx.waitUntil(submitIndexNow(config,scope.tasks,send));}catch{/* No runtime lifetime support: indexing remains best-effort. */}}}
 });
}
