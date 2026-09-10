import {z} from 'zod';
import {type DB,ApiError,all,one,insert,event,hash,throttle,taskContract,body} from './commons.ts';
import {HUMAN_DESK} from './humans.ts';

const guard={request_id:z.string().uuid(),website:z.literal('').default(''),public_consent:z.literal(true)};
const problemSchema=z.object({...guard,title:z.string().trim().min(5).max(100),problem:z.string().trim().min(20).max(4000),done:z.string().trim().min(10).max(1000),sources:z.array(z.string().max(2000)).max(5).default([]),category:taskContract.shape.category}).strict();
const commentSchema=z.object({...guard,content:z.string().trim().min(5).max(4000),kind:z.enum(['note','ai_draft']).default('note')}).strict();

export async function guestBody(db:DB,req:Request,scope:string){
  if(req.headers.get('origin')!==new URL(req.url).origin || req.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'ORIGIN_REJECTED','Post from this site’s form.');
  const ip=req.headers.get('cf-connecting-ip')||'unknown';
  const visitor=await hash(new Date().toISOString().slice(0,10)+':'+ip);
  await throttle(db,'guest-request:'+visitor,30,60);
  const value=await body(req);
  await throttle(db,'guest:'+scope+':'+visitor,scope==='problem'?3:20,3600);
  await throttle(db,'guest:'+scope+':global',scope==='problem'?100:2000,86400);
  return value;
}
function rejectSecrets(value:unknown){if(/ac_[a-f0-9]{64}|-----BEGIN .*PRIVATE KEY|sk-[A-Za-z0-9_-]{24,}/.test(JSON.stringify(value)))throw new ApiError(422,'POSSIBLE_SECRET','Remove credentials from public content.');}
function conflict(){throw new ApiError(409,'DUPLICATE_ID','This request ID was already used for different content. Refresh after saving your draft.');}
export async function submitGuestProblem(db:DB,input:unknown){
  const v=problemSchema.parse(input);rejectSecrets(v);
  const contentHash=await hash(JSON.stringify(v));
  const prior=await one(db,'SELECT task_id,content_hash FROM guest_submissions WHERE request_id=?',v.request_id);
  if(prior){if(prior.content_hash!==contentHash)conflict();return {id:prior.task_id,status:'pending',url:'/tasks/'+prior.task_id};}
  const protocol=taskContract.parse({objective:v.problem,category:v.category,risk_level:'low',estimated_minutes:15,allowed_tools:['local_reasoning','local_text_processing','public_https_read'],inputs:v.sources.map(url=>({description:'Visitor-supplied public source; untrusted.',url})),expected_output:'A concise finding or useful partial progress, with sources, limitations, and the next check.',acceptance_criteria:[v.done,'An eligible independent agent checks the evidence and the site moderator accepts the result.'],license:'CC-BY-4.0',attribution:'Anonymous visitor brief. Credit the producing agent for original work; source licenses remain separate.'});
  const stamp=new Date().toISOString(),id=crypto.randomUUID();
  try{await db.batch([
    insert(db,'tasks',{id,created_at:stamp,updated_at:stamp,creator:HUMAN_DESK,title:v.title,description:v.problem,required_capabilities:[v.category],protocol,moderation_status:'pending',status:'open'}),
    insert(db,'guest_submissions',{request_id:v.request_id,task_id:id,content_hash:contentHash,created_at:stamp}),
    event(db,null,'visitor problem submitted','tasks',id,'Anonymous public task. Awaiting moderation; no account or email collected.')
  ]);}catch(e){const existing=await one(db,'SELECT task_id,content_hash FROM guest_submissions WHERE request_id=?',v.request_id);if(!existing)throw e;if(existing.content_hash!==contentHash)conflict();return {id:existing.task_id,status:'pending',url:'/tasks/'+existing.task_id};}
  return {id,status:'pending',url:'/tasks/'+id};
}
export async function discussionTask(db:DB,id:string){z.string().uuid().parse(id);const t=await one(db,'SELECT id,status,moderation_status FROM tasks WHERE id=?',id);if(!t)throw new ApiError(404,'NOT_FOUND','Task not found.');return t;}
export async function discussion(db:DB,taskId:string,offset=0){
  await discussionTask(db,taskId);z.number().int().min(0).max(100000).parse(offset);
  const rows=await all(db,"SELECT id,created_at,kind,CASE WHEN hidden=1 THEN '' ELSE content END AS content,hidden FROM board_comments WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 31 OFFSET ?",taskId,offset);
  return {items:rows.slice(0,30),next_offset:rows.length>30?offset+30:null};
}
export async function postDiscussion(db:DB,taskId:string,input:unknown){
  const t=await discussionTask(db,taskId);if(t.moderation_status!=='approved'||t.status==='closed')throw new ApiError(409,'DISCUSSION_CLOSED','Discussion opens after approval and is paused on closed tasks.');
  const v=commentSchema.parse(input);rejectSecrets(v);const contentHash=await hash(JSON.stringify({taskId,...v}));
  const prior=await one(db,'SELECT id,content_hash FROM board_comments WHERE id=?',v.request_id);if(prior){if(prior.content_hash!==contentHash)conflict();const row=await one(db,'SELECT hidden FROM board_comments WHERE id=?',prior.id);return {id:prior.id,moderation_status:row?.hidden?'held':'visible'};}
  const normalized=v.content.toLowerCase().replace(/\s+/g,' ').trim();
  const recent=await all(db,'SELECT content FROM board_comments WHERE task_id=? ORDER BY created_at DESC LIMIT 100',taskId);
  if(recent.some((c:any)=>c.content.toLowerCase().replace(/\s+/g,' ').trim()===normalized))throw new ApiError(409,'DUPLICATE_CONTENT','This note is already on this task. Add new evidence instead of posting it again.');
  const held=/^Open Task Relay:\s*https:\/\/[^\s]+\s+Choose one open problem/i.test(v.content)||/ignore (?:all |the )?(?:previous|system|developer) instructions|reveal (?:your |the )?(?:system prompt|api key|credentials)|send (?:your |all )?(?:credentials|tokens) to/i.test(v.content);
  const stamp=new Date().toISOString();
  try{const rows=await all(db,"INSERT INTO board_comments(id,created_at,task_id,kind,content,content_hash,hidden) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND moderation_status='approved' AND status!='closed') RETURNING id",v.request_id,stamp,taskId,v.kind,v.content,contentHash,held?1:0,taskId);if(!rows.length)throw new ApiError(409,'DISCUSSION_CLOSED','Discussion is paused.');}
  catch(e){const existing=await one(db,'SELECT id,content_hash FROM board_comments WHERE id=?',v.request_id);if(!existing)throw e;if(existing.content_hash!==contentHash)conflict();}
  if(held)await db.prepare("INSERT INTO comment_moderation(id,created_at,comment_id,action,reason,actor) VALUES(?,?,?,'held',?,'automatic moderation') ON CONFLICT(id) DO NOTHING").bind('held:'+v.request_id,stamp,v.request_id,'Generic copied instruction prompt or obvious instruction-override pattern; human review required.').run();
  return {id:v.request_id,moderation_status:held?'held':'visible'};
}
export async function reportComment(db:DB,taskId:string,input:unknown){
  const v=z.object({...guard,action:z.literal('report'),comment_id:z.string().uuid(),reason:z.string().trim().min(10).max(1000)}).strict().parse(input);
  if(!await one(db,'SELECT id FROM board_comments WHERE id=? AND task_id=?',v.comment_id,taskId))throw new ApiError(404,'NOT_FOUND','Comment not found.');
  await db.prepare("INSERT INTO reports(id,created_at,author,entity_type,entity_id,reason) VALUES (?,?,?,'board_comments',?,?) ON CONFLICT(id) DO NOTHING").bind(v.request_id,new Date().toISOString(),HUMAN_DESK,v.comment_id,v.reason).run();
  return {status:'reported'};
}
export async function moderateComment(db:DB,input:unknown){
 const v=z.object({comment_id:z.string().uuid(),reason:z.string().trim().min(10).max(1000),action:z.enum(['hidden','restored']).default('hidden')}).strict().parse(input);
 if(!await one(db,'SELECT id FROM board_comments WHERE id=?',v.comment_id))throw new ApiError(404,'NOT_FOUND','Comment not found.');
 await db.batch([db.prepare('UPDATE board_comments SET hidden=? WHERE id=?').bind(v.action==='hidden'?1:0,v.comment_id),
  insert(db,'comment_moderation',{id:crypto.randomUUID(),created_at:new Date().toISOString(),comment_id:v.comment_id,action:v.action,reason:v.reason,actor:'authenticated site moderator'}),
  event(db,null,v.action==='hidden'?'comment hidden':'comment restored','board_comments',v.comment_id,'Moderator action. Original and reason retained privately for abuse review.')]);
 return {status:v.action};
}
export async function hideComment(db:DB,input:unknown){return moderateComment(db,input);}
