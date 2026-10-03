import {z} from 'zod';
import {ApiError,schemas,taskContract,prohibitedActions} from './commons.ts';
import {validateSourceLinks,publicHttpsUrl} from './sources.ts';
import {categoryKeys} from './categories.ts';
import {relayDigest} from './relay-executor.ts';
import type {RelayDatabase} from './relay-state.ts';
import {enabledGuard,guard,receipt,sourceSchema} from './relay-operator-store.ts';
import {OPERATOR_LIMITS,OPERATOR_RULES} from './relay-operator-policy.ts';
const text=z.string().trim().min(1).max(2000);
export const requestKey=z.string().regex(/^[a-f0-9]{64}$/);
export const requestSchema=z.object({request_key:requestKey,title:z.string().trim().min(2).max(100),
 objective:text,beneficiary:text,next_action:text,expected_output:text,
 acceptance_criteria:z.array(text).min(1).max(5),sources:z.array(publicHttpsUrl).min(1).max(5),
 category:z.enum(categoryKeys),intent:z.enum(['public_good_research','promotion','transaction']).default('public_good_research'),
 website:z.string().max(200).default('')}).strict();
export const requestRow=z.object({id:z.string().uuid(),status:z.enum(['HOLD','DENY','DRAFT','PUBLISHED']),reason:z.string(),
 payload_hash:z.string(),input_json:z.string(),draft_json:z.string().nullable(),draft_hash:z.string().nullable(),
 revision:z.number(),task_id:z.string().nullable(),created_at:z.number()});
export function normalizeRequest(value:z.infer<typeof requestSchema>){
 return schemas.tasks.parse({title:value.title,description:value.objective+'\n\nPublic beneficiary: '+value.beneficiary,
 objective:value.objective,category:value.category,estimated_minutes:5,relay_leg_minutes:5,
 next_action:value.next_action,next_action_sources:value.sources,next_action_output:value.expected_output,
 inputs:value.sources.map(url=>({description:'Requester-supplied public starting source; verification is recorded in the private assessment.',url})),
 expected_output:value.expected_output,acceptance_criteria:value.acceptance_criteria,
 risk_level:'review_required',external_side_effects_allowed:false,license:'CC-BY-4.0'});
}
export function screenRequest(value:z.infer<typeof requestSchema>){
 if(value.website)return {status:'DENY' as const,reason:'SPAM_TRAP: hidden website field was filled. Resubmit with this field empty.'};
 if(value.intent!=='public_good_research')return {status:'DENY' as const,reason:'OFF_MISSION: promotions and transactions are outside this research inbox. Resubmit a bounded public-good research request.'};
 return {status:'HOLD' as const,reason:'HOLD: queued for Relay assessment. Uncertain proposals require moderation review; a verified task may be published within the daily limit.'};
}
export function publicReceipt(row:z.infer<typeof requestRow>){return {id:row.id,status:row.status,reason:row.reason,
 task_id:row.task_id,resubmit:'Correct the request and submit with a new random request_key. Keep the key private to check status.'}}
export async function getRequestReceipt(db:RelayDatabase,key:string){
 requestKey.parse(key);
 const row=await db.prepare('SELECT * FROM relay_task_requests WHERE key_hash=?').bind(await relayDigest(key)).first();
 if(!row)throw new ApiError(404,'NOT_FOUND','No request found for this private key.');
 return publicReceipt(requestRow.parse(row));
}
export async function submitRequest(db:RelayDatabase,input:unknown,ip:string,source:string,channel:'chat'|'form'='form'){
 sourceSchema.parse(source);
 const v=requestSchema.parse(input),{request_key,website,...content}=v;
 const raw=JSON.stringify(content);
 if(raw.length>16000)throw new ApiError(413,'PAYLOAD_TOO_LARGE','Request too large.');
 const keyHash=await relayDigest(request_key),payloadHash=await relayDigest(JSON.stringify({...content,website}));
 const prior=await db.prepare('SELECT * FROM relay_task_requests WHERE key_hash=?').bind(keyHash).first();
 if(prior){const row=requestRow.parse(prior);if(row.payload_hash!==payloadHash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Use a new key for a changed request.');return publicReceipt(row)}
 const now=Date.now(),day=Math.floor(now/86400000),ipKey='request-ip:'+day+':'+await relayDigest(ip),globalKey='request-global:'+day;
 const decision=screenRequest(v),id=crypto.randomUUID(),candidate=JSON.stringify(normalizeRequest(v));
 const [enabled,clearEnabled]=enabledGuard(db);
 const [quota,clearQuota]=guard(db,`coalesce((SELECT count FROM limits WHERE key=?),0)<3
 AND coalesce((SELECT count FROM limits WHERE key=?),0)<40 AND (SELECT count(*) FROM relay_task_requests)<2000`,[ipKey,globalKey]);
 try{
 await db.batch([enabled,quota,...[ipKey,globalKey].map(key=>db.prepare(`INSERT INTO limits(key,count,expires) VALUES (?,1,?)
 ON CONFLICT(key) DO UPDATE SET count=count+1`).bind(key,(day+2)*86400)),
 db.prepare(`INSERT INTO relay_task_requests(id,key_hash,payload_hash,created_at,status,reason,input_json,draft_json,draft_hash)
 VALUES (?,?,?,?,?,?,?,?,?)`).bind(id,keyHash,payloadHash,now,decision.status,decision.reason,raw,candidate,await relayDigest(candidate)),
 await receipt(db,{key:'intake:'+keyHash,actor:'site_operator:relay',rule:OPERATOR_RULES.intake,reason:decision.reason,
 source,target:id,before:{},after:{status:decision.status,payload_hash:payloadHash,intake_version:'1.8',visitor_confirmed:true,channel},autonomous:false}),clearQuota,clearEnabled]);
 }catch{
  const raced=await db.prepare('SELECT * FROM relay_task_requests WHERE key_hash=?').bind(keyHash).first();
  if(raced){const row=requestRow.parse(raced);if(row.payload_hash===payloadHash)return publicReceipt(row);throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Use a new key for a changed request.')}
  if(!await db.prepare('SELECT id FROM relay_operator_control WHERE enabled=1 AND id=1').first())throw new ApiError(503,'PAUSED','Request inbox is paused.');
  // Only known capacity exhaustion is 429; audit/database/model failures remain closed.
  const full=z.object({capacity_exhausted:z.number()}).parse(await db.prepare(`SELECT (coalesce((SELECT count FROM limits WHERE key=?),0)>=3
   OR coalesce((SELECT count FROM limits WHERE key=?),0)>=40 OR (SELECT count(*) FROM relay_task_requests)>=2000) capacity_exhausted`).bind(ipKey,globalKey).first());
  if(full.capacity_exhausted)throw new ApiError(429,'RATE_LIMITED','Request inbox capacity reached. Retry after 86400 seconds');
  throw new ApiError(503,'HOLD','Request was not committed. Retry the identical request with the same key.');
 }
 return {id,...decision,task_id:null,resubmit:'Correct the request and submit with a new random request_key. Keep the key private to check status.'};
}

const draftSchema=schemas.tasks.omit({room_id:true,parent_id:true}).extend({
 objective:text,next_action:text,next_action_sources:z.array(publicHttpsUrl).min(1).max(5),
 relay_leg_minutes:z.number().int().min(1).max(5),risk_level:z.literal('review_required'),
 external_side_effects_allowed:z.literal(false),
});
const base={request_id:z.string().uuid(),expected_revision:z.number().int().positive(),decision_key:z.string().uuid()};
export const ownerDecisionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepare'),...base,draft:draftSchema,confirm_review:z.literal(true)}).strict(),
 z.object({action:z.literal('publish'),...base,draft_hash:z.string().regex(/^[a-f0-9]{64}$/),confirm_publication:z.literal(true)}).strict(),
 z.object({action:z.literal('hold'),...base}).strict(),
 z.object({action:z.literal('deny'),...base,reason:z.string().trim().min(1).max(200)}).strict(),
]);
/** Called only by the verified Access + same-origin owner adapter. No Relay call graph reaches this function. */
export async function ownerRequestDecision(db:RelayDatabase,input:unknown,owner:string,source:string){
 sourceSchema.parse(source);if(!owner)throw new ApiError(403,'FORBIDDEN','Verified moderator required');
 const d=ownerDecisionSchema.parse(input),key='owner:'+d.decision_key;
 const hash=await relayDigest(JSON.stringify(d));
 const prior=await db.prepare('SELECT after_json FROM relay_operator_receipts WHERE action_key=?').bind(key).first();
 if(prior){const state=JSON.parse(z.object({after_json:z.string()}).parse(prior).after_json);if(state.decision_hash!==hash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','Decision key has changed');return state}
 const row=requestRow.parse(await db.prepare('SELECT * FROM relay_task_requests WHERE id=?').bind(d.request_id).first());
 if(row.status==='PUBLISHED'||row.revision!==d.expected_revision)throw new ApiError(409,'STALE_DECISION','Reload the request before deciding.');
 const [enabled,clearEnabled]=enabledGuard(db),[check,clear]=guard(db,"EXISTS(SELECT 1 FROM relay_task_requests WHERE id=? AND revision=? AND status!='PUBLISHED')",[row.id,row.revision]);
 const statements=[enabled,check];
 let after:{decision_hash:string;status:string;task_id?:string;draft_hash?:string}={decision_hash:hash,status:'HOLD'};
 let rule:string=OPERATOR_RULES.draft,reason='Moderation held request for further review.';
 if(d.action==='prepare'){
  const parsed=draftSchema.parse(d.draft);
  if(!validateSourceLinks(parsed.next_action_sources,parsed.source_expectations||[]))throw new ApiError(422,'SOURCE_MISMATCH','Expectations must reference starting source URLs.');
  const draft=JSON.stringify(parsed),digest=await relayDigest(draft);
  if(draft.length>24000)throw new ApiError(413,'PAYLOAD_TOO_LARGE','Draft too large.');
  after={...after,status:'DRAFT',draft_hash:digest};reason='Moderation reviewed normalized draft; separate publication confirmation required.';
  statements.push(db.prepare("UPDATE relay_task_requests SET status='DRAFT',reason=?,draft_json=?,draft_hash=?,revision=revision+1 WHERE id=?").bind(reason,draft,digest,row.id));
 }else if(d.action==='publish'){
  if(row.status!=='DRAFT'||row.draft_hash!==d.draft_hash||!row.draft_json||await relayDigest(row.draft_json)!==d.draft_hash)
   throw new ApiError(409,'STALE_DRAFT','Prepare and review the current draft first.');
  const draft=draftSchema.parse(JSON.parse(row.draft_json));
  const creator=z.object({id:z.string()}).nullable().parse(await db.prepare("SELECT id FROM agents WHERE managed=1 AND demo=0 AND status='active' AND posting_restricted=0 ORDER BY created_at,id LIMIT 1").first());
  if(!creator)throw new ApiError(409,'NO_CURATOR','Existing site curator required.');
  const taskId=crypto.randomUUID(),stamp=new Date().toISOString(),protocol={...taskContract.parse(draft),revision:1,prohibited_actions:prohibitedActions};
  const [identity,clearIdentity]=guard(db,"EXISTS(SELECT 1 FROM agents WHERE id=? AND managed=1 AND demo=0 AND status='active' AND posting_restricted=0)",[creator.id]);
  statements.push(identity,db.prepare(`INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status)
   VALUES (?,?,?,?,?,?,?,?,'open','approved')`).bind(taskId,stamp,stamp,creator.id,draft.title,draft.description,JSON.stringify(draft.required_capabilities),JSON.stringify(protocol)),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_id,entity_type,summary) VALUES (?,?,?,'created',?,'tasks','Moderation confirmed task-request publication.')")
    .bind(crypto.randomUUID(),stamp,creator.id,taskId),
   db.prepare("UPDATE relay_task_requests SET status='PUBLISHED',reason='Moderation confirmed publication.',task_id=?,revision=revision+1 WHERE id=?").bind(taskId,row.id),clearIdentity);
  after={...after,status:'PUBLISHED',task_id:taskId,draft_hash:d.draft_hash};rule=OPERATOR_RULES.publish;reason='Moderation explicitly confirmed this exact draft and revision.';
 }else{
  after.status=d.action==='deny'?'DENY':'HOLD';reason=d.action==='deny'?d.reason:reason;
  statements.push(db.prepare('UPDATE relay_task_requests SET status=?,reason=?,revision=revision+1 WHERE id=?').bind(after.status,reason,row.id));
 }
 statements.push(await receipt(db,{key,actor:'owner:'+owner,rule,reason,source,target:row.id,
 before:{status:row.status,revision:row.revision,draft_hash:row.draft_hash},after}),clear,clearEnabled);
 await db.batch(statements);
 return after;
}
