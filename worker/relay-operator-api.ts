import {z} from 'zod';
import {body,ApiError} from '../lib/commons.ts';
import {getRequestReceipt,submitRequest,ownerRequestDecision} from '../lib/relay-requests.ts';
import {guard,receipt,jsonRows,sourceSchema} from '../lib/relay-operator-store.ts';
import {OPERATOR_LIMITS,OPERATOR_RULES} from '../lib/relay-operator-policy.ts';
import {verifyOwner,type OwnerEnv} from './owner-access.ts';
import type {RelayDatabase} from '../lib/relay-state.ts';
import {relayDigest} from '../lib/relay-executor.ts';
export type OperatorEnv=OwnerEnv&Partial<RelaySchedulerBindings>&{DB:RelayDatabase};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const ownerAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('control'),enabled:z.boolean(),expected_revision:z.number().int().positive(),decision_key:z.string().uuid()}).strict(),
 z.object({action:z.literal('resolve'),id:z.string().uuid(),decision_key:z.string().uuid()}).strict(),
 z.object({action:z.literal('restore'),receipt_id:z.string().uuid(),decision_key:z.string().uuid()}).strict(),
]);
export async function operatorOwnerAction(db:RelayDatabase,input:unknown,owner:string,source:string){
 if(!owner)throw new ApiError(403,'FORBIDDEN','Verified owner required');sourceSchema.parse(source);
 const d=ownerAction.parse(input),key='owner:'+d.decision_key,hash=await relayDigest(JSON.stringify(d));
 const prior=await db.prepare('SELECT after_json FROM relay_operator_receipts WHERE action_key=?').bind(key).first();
 if(prior){const p=JSON.parse(z.object({after_json:z.string()}).parse(prior).after_json);if(p.decision_hash!==hash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Decision changed');return p}
 const after={decision_hash:hash,...d};
 if(d.action==='control'){
  const [check,clear]=guard(db,'EXISTS(SELECT 1 FROM relay_operator_control WHERE id=1 AND revision=?)',[d.expected_revision]);
  await db.batch([check,db.prepare('UPDATE relay_operator_control SET enabled=?,revision=revision+1 WHERE id=1').bind(d.enabled?1:0),
   await receipt(db,{key,actor:'owner:'+owner,rule:OPERATOR_RULES.control,reason:d.enabled?'Owner enabled Relay.':'Owner paused Relay.',source,target:'control',
    before:{revision:d.expected_revision},after}),clear]);
 }else if(d.action==='resolve'){
  const row=z.object({incident_id:z.string(),status:z.string()}).parse(await db.prepare('SELECT incident_id,status FROM relay_operator_followups WHERE id=?').bind(d.id).first());
  const [check,clear]=guard(db,"EXISTS(SELECT 1 FROM relay_operator_followups WHERE id=? AND status='open')",[d.id]);
  await db.batch([check,db.prepare("UPDATE relay_operator_followups SET status='resolved' WHERE id=?").bind(d.id),
   db.prepare("UPDATE relay_incidents SET status='resolved' WHERE id=?").bind(row.incident_id),
   await receipt(db,{key,actor:'owner:'+owner,rule:OPERATOR_RULES.resolve,reason:'Owner resolved follow-up; task history unchanged.',source,target:d.id,before:row,after}),clear]);
 }else{
  const row=z.object({before_json:z.string(),after_json:z.string(),target_id:z.string(),policy_rule:z.literal(OPERATOR_RULES.expire)})
   .parse(await db.prepare('SELECT before_json,after_json,target_id,policy_rule FROM relay_operator_receipts WHERE id=?').bind(d.receipt_id).first());
  const shape=z.object({id:z.string(),status:z.string(),assignee:z.string().nullable(),claim_expires_at:z.string().nullable(),updated_at:z.string(),protocol:z.string().nullable()});
  const before=shape.parse(JSON.parse(row.before_json)),previous=shape.parse(JSON.parse(row.after_json));
  const [check,clear]=guard(db,`EXISTS(SELECT 1 FROM tasks WHERE id=? AND status='open' AND accepted_result_id IS NULL
   AND assignee IS NULL AND claim_expires_at IS NULL AND updated_at=? AND protocol IS ? AND moderation_status='approved'
   AND NOT EXISTS(SELECT 1 FROM results WHERE task_id=tasks.id))`,[row.target_id,previous.updated_at,previous.protocol]);
  await db.batch([check,db.prepare('UPDATE tasks SET status=?,assignee=?,claim_expires_at=?,updated_at=? WHERE id=?')
   .bind(before.status,before.assignee,before.claim_expires_at,before.updated_at,row.target_id),
   await receipt(db,{key,actor:'owner:'+owner,rule:OPERATOR_RULES.restore,reason:'Owner restored exact pre-expiry lease. Original expiry still applies.',
    source,target:row.target_id,before:previous,after:{...after,restored:before}}),clear]);
 }
 return after;
}

export async function relayOperatorResponse(request:Request,env:OperatorEnv):Promise<Response|null>{
 const url=new URL(request.url),ownerPath=url.pathname==='/api/moderation/relay',publicPath=url.pathname==='/api/task-requests';
 if(!ownerPath&&!publicPath)return null;
 if(env.RELAY_SELF_HOSTED!=='true'||env.RELAY_OPERATOR_ENABLED!=='true'||env.MIGRATION_FREEZE==='true')return reply({error:{code:'DISABLED',message:'Operator inbox is disabled.'}},503);
 try{
  const source=sourceSchema.parse(env.RELAY_SHADOW_SOURCE_VERSION);
  if(ownerPath){
   const owner=await verifyOwner(request.headers.get('cf-access-jwt-assertion')||'',env);
   if(!owner)throw new ApiError(403,'FORBIDDEN','Verified owner sign-in required');
   if(request.method==='GET'){
    const offset=z.coerce.number().int().min(0).max(2000).parse(url.searchParams.get('offset')||0);
    const requests=await jsonRows(env.DB,`SELECT coalesce(json_group_array(json_object('id',id,'status',status,'reason',reason,'created_at',created_at,
     'input_json',input_json,'draft_json',draft_json,'draft_hash',draft_hash,'revision',revision,'task_id',task_id,'assessment_json',(SELECT after_json FROM relay_operator_receipts a WHERE a.target_id=requests.id AND a.policy_rule='request.assess.v1.8' LIMIT 1))),'[]') rows
     FROM (SELECT * FROM relay_task_requests ORDER BY created_at DESC,id LIMIT 50 OFFSET ?) AS requests` ,[offset]);
    const followups=await jsonRows(env.DB,`SELECT coalesce(json_group_array(json_object('id',id,'target_id',target_id,'reason',reason,'status',status)),'[]') rows
     FROM (SELECT * FROM relay_operator_followups WHERE status='open' ORDER BY created_at LIMIT 50)`);
    const receipts=await jsonRows(env.DB,`SELECT coalesce(json_group_array(json_object('id',id,'action_key',action_key,'policy_rule',policy_rule,'reason',reason,
     'source_version',source_version,'target_id',target_id,'created_at',created_at,'actor',actor,'before_json',before_json,'after_json',after_json)),'[]') rows
     FROM (SELECT * FROM relay_operator_receipts ORDER BY created_at DESC LIMIT 50)`);
    const health=await env.DB.prepare("SELECT o.observed_at,o.state_json_redacted FROM relay_check_state c JOIN relay_observations o ON o.id=c.observation_id WHERE c.check_id='operator.health'").first();
    const control=await env.DB.prepare('SELECT enabled,revision FROM relay_operator_control WHERE id=1').first();
    return reply({data:{requests,followups,receipts,health,control,limits:OPERATOR_LIMITS,source_version:source,offset,next_offset:requests.length===50?offset+50:null}});
   }
   if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED','Use GET or POST');
   if(request.headers.get('origin')!==url.origin)throw new ApiError(403,'ORIGIN_REJECTED','Same-origin owner action required');
   const input=await body(request);
   const action=z.object({action:z.string()}).parse(input).action;
   const result=['control','resolve','restore'].includes(action)?await operatorOwnerAction(env.DB,input,owner,source):await ownerRequestDecision(env.DB,input,owner,source);
   return reply({data:result});
  }
  if(request.method==='GET')return reply({data:await getRequestReceipt(env.DB,request.headers.get('x-request-key')||'')});
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED','Use GET or POST');
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'ORIGIN_REJECTED','Use a same-origin form or direct agent request');
  return reply({data:await submitRequest(env.DB,await body(request),request.headers.get('cf-connecting-ip')||'unknown',source)},201);
 }catch(error){
  if(error instanceof ApiError){const r=reply({error:{code:error.code,message:error.message}},error.status);if(error.status===429)r.headers.set('Retry-After','86400');return r}
  if(error instanceof z.ZodError)return reply({error:{code:'INVALID_INPUT',message:'Check the request fields. No decision was applied.'}},422);
  // Never expose raw request content, SQL, credentials or exception text.
  return reply({error:{code:'HOLD',message:'Action unavailable or state changed. Reload; retry uncertain writes with the identical key.'}},409);
 }
}
