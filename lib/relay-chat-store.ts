import {z} from 'zod';
// Chat owns this narrow storage port; it imports no Operator/private-state module.
export interface ChatStatement {
 bind(...values:(string|number|null)[]):ChatStatement;
 first():Promise<unknown>;
 run():Promise<unknown>;
}
export interface ChatDatabase {
 prepare(sql:string):ChatStatement;
 batch(statements:ChatStatement[]):Promise<unknown[]>;
}
import {CHAT_LIMITS as L,CHAT_MODEL,CHAT_TARIFF,CHAT_PRICES} from './relay-chat-policy.ts';
const encoder=new TextEncoder();
async function billingLimits(db:ChatDatabase){
 const row=await db.prepare('SELECT day_microusd,month_microusd FROM relay_billing_limits WHERE id=1').first();
 const parsed=z.object({day_microusd:z.number().int().positive(),month_microusd:z.number().int().positive()}).nullable().parse(row);
 return {dayMicrousd:parsed?.day_microusd??L.dayMicrousd,monthMicrousd:parsed?.month_microusd??L.monthMicrousd};
}
function billingGuard(b:{dayMicrousd:number;monthMicrousd:number}){return `AND coalesce((SELECT day_microusd FROM relay_billing_limits WHERE id=1),${L.dayMicrousd})=${b.dayMicrousd} AND coalesce((SELECT month_microusd FROM relay_billing_limits WHERE id=1),${L.monthMicrousd})=${b.monthMicrousd}`;}

export async function chatIpKey(ip:string,secret:string,day:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(day+':'+ip)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
/** One transaction increments ALL limits and reserves the full maximum before any model call.
 * A CHECK failure rolls back every row. No read-then-increment race or spend refund. */
export async function reserveChat(db:ChatDatabase,ipKey:string,now=Date.now(),limits:{reserveMicrousd:number}=L){
 const B=await billingLimits(db);
 const stamp=new Date(now).toISOString(),day=stamp.slice(0,10),month=stamp.slice(0,7),minute=stamp.slice(0,16),id=crypto.randomUUID();
 const buckets:[string,string,number,number,number][]=[
  ['day',day,L.dailyQuestions,B.dayMicrousd,limits.reserveMicrousd],['month',month,3100,B.monthMicrousd,limits.reserveMicrousd],
  ['minute',minute,L.globalMinute,B.dayMicrousd,0],['ip-day',day+':'+ipKey,L.ipDay,B.dayMicrousd,0],
  ['ip-minute',minute+':'+ipKey,L.ipMinute,B.dayMicrousd,0]];
 await db.batch([
  // Explicit owner opt-in, matching tariff and expiring review; checked at reservation time.
  db.prepare(`INSERT INTO relay_chat_buckets(kind,period,calls,charged_microusd,call_limit,cost_limit,expires_at)
    SELECT 'guard',?,CASE WHEN EXISTS(SELECT 1 FROM relay_chat_control WHERE id=1 AND enabled=1 AND tariff=? AND reviewed_until>? AND reviewed_until<=?)
      AND (SELECT coalesce(sum(reserved_microusd),0) FROM relay_chat_calls WHERE status!='accounted' AND created_at<?)
       +coalesce((SELECT charged_microusd FROM relay_chat_buckets WHERE kind='day' AND period=?),0)+?<=?
      AND (SELECT coalesce(sum(reserved_microusd),0) FROM relay_chat_calls WHERE status!='accounted' AND created_at<?)
       +coalesce((SELECT charged_microusd FROM relay_chat_buckets WHERE kind='month' AND period=?),0)+?<=?
      ${billingGuard(B)} THEN 0 ELSE 2 END,0,1,0,?`)
    .bind(id,CHAT_TARIFF,now,now+31*86400000,Date.parse(day+'T00:00:00Z'),day,limits.reserveMicrousd,B.dayMicrousd,Date.parse(month+'-01T00:00:00Z'),month,limits.reserveMicrousd,B.monthMicrousd,now),
  ...buckets.map(([kind,period,limit,cost,charge])=>db.prepare(`INSERT INTO relay_chat_buckets(kind,period,calls,charged_microusd,call_limit,cost_limit,expires_at)
    VALUES (?,?,1,?,?,?,?) ON CONFLICT(kind,period) DO UPDATE SET calls=calls+1,charged_microusd=charged_microusd+excluded.charged_microusd,
      call_limit=CASE WHEN kind IN ('ip-day','ip-minute') THEN excluded.call_limit ELSE call_limit END,cost_limit=excluded.cost_limit`)
    .bind(kind,period,charge,limit,cost,now+(kind.startsWith('ip-')||kind==='minute'?2:400)*86400000)),
  db.prepare(`INSERT INTO relay_chat_calls(id,created_at,model,tariff,reserved_microusd,status) VALUES (?,?,?,?,?,'reserved')`).bind(id,now,CHAT_MODEL,CHAT_TARIFF,limits.reserveMicrousd),
  db.prepare("DELETE FROM relay_chat_buckets WHERE kind='guard' OR expires_at<?").bind(now),
 ]);
 return id;
}
/** Scheduled resolution reads share the existing chat dollar ceilings and call ledger.
 * A separate call bucket bounds automatic assessments to three per UTC day. */
export const RESOLUTION_MODEL=CHAT_MODEL;
export const RESOLUTION_MAX_INPUT=24_000,RESOLUTION_MAX_OUTPUT=8_192;
export const RESOLUTION_RESERVE=Math.ceil((RESOLUTION_MAX_INPUT+1024)*CHAT_PRICES.input+RESOLUTION_MAX_OUTPUT*CHAT_PRICES.output);
export async function reserveResolution(db:ChatDatabase,now=Date.now()){
 const B=await billingLimits(db);
 const stamp=new Date(now).toISOString(),day=stamp.slice(0,10),month=stamp.slice(0,7),minute=stamp.slice(0,16),id=crypto.randomUUID();
 await db.batch([
  db.prepare(`INSERT INTO relay_chat_buckets(kind,period,calls,charged_microusd,call_limit,cost_limit,expires_at)
   SELECT 'guard',?,CASE WHEN EXISTS(SELECT 1 FROM relay_chat_control WHERE id=1 AND enabled=1 AND tariff=? AND reviewed_until>? AND reviewed_until<=?)
    AND EXISTS(SELECT 1 FROM relay_operator_control WHERE id=1 AND enabled=1)
    AND (SELECT coalesce(sum(reserved_microusd),0) FROM relay_chat_calls WHERE status!='accounted' AND created_at<?)
      +coalesce((SELECT charged_microusd FROM relay_chat_buckets WHERE kind='day' AND period=?),0)+?<=?
    AND (SELECT coalesce(sum(reserved_microusd),0) FROM relay_chat_calls WHERE status!='accounted' AND created_at<?)
      +coalesce((SELECT charged_microusd FROM relay_chat_buckets WHERE kind='month' AND period=?),0)+?<=?
    ${billingGuard(B)} THEN 0 ELSE 2 END,0,1,0,?`)
   .bind(id,CHAT_TARIFF,now,now+31*86400000,Date.parse(day+'T00:00:00Z'),day,RESOLUTION_RESERVE,B.dayMicrousd,Date.parse(month+'-01T00:00:00Z'),month,RESOLUTION_RESERVE,B.monthMicrousd,now),
  ...([['day',day,L.dailyQuestions,B.dayMicrousd,RESOLUTION_RESERVE],['month',month,3100,B.monthMicrousd,RESOLUTION_RESERVE],
   ['minute',minute,L.globalMinute,B.dayMicrousd,0],['resolution-day',day,3,B.dayMicrousd,0]] as [string,string,number,number,number][])
   .map(([kind,period,limit,cost,charge])=>db.prepare(`INSERT INTO relay_chat_buckets(kind,period,calls,charged_microusd,call_limit,cost_limit,expires_at)
    VALUES (?,?,1,?,?,?,?) ON CONFLICT(kind,period) DO UPDATE SET calls=calls+1,charged_microusd=charged_microusd+excluded.charged_microusd,cost_limit=excluded.cost_limit`)
    .bind(kind,period,charge,limit,cost,now+400*86400000)),
  db.prepare(`INSERT INTO relay_chat_calls(id,created_at,model,tariff,reserved_microusd,status) VALUES (?,?,?,?,?,'reserved')`)
   .bind(id,now,RESOLUTION_MODEL,CHAT_TARIFF,RESOLUTION_RESERVE),
  db.prepare("DELETE FROM relay_chat_buckets WHERE kind='guard' OR expires_at<?").bind(now),
 ]);
 return id;
}
export async function accountResolution(db:ChatDatabase,id:string,result:unknown){
 const parsed=z.object({usage:z.object({prompt_tokens:z.number().int().min(0).max(RESOLUTION_MAX_INPUT+1024),
  completion_tokens:z.number().int().min(0).max(RESOLUTION_MAX_OUTPUT),total_tokens:z.number().int().min(0)})}).safeParse(result);
 if(!parsed.success||parsed.data.usage.total_tokens!==parsed.data.usage.prompt_tokens+parsed.data.usage.completion_tokens){
  await db.prepare("UPDATE relay_chat_calls SET status='usage_unknown' WHERE id=? AND status='reserved'").bind(id).run();return false;
 }
 const u=parsed.data.usage,cost=Math.ceil(u.prompt_tokens*CHAT_PRICES.input+u.completion_tokens*CHAT_PRICES.output);
 await db.prepare("UPDATE relay_chat_calls SET status='accounted',input_tokens=?,output_tokens=?,actual_microusd=? WHERE id=? AND status='reserved'")
  .bind(u.prompt_tokens,u.completion_tokens,cost,id).run();return true;
}
const count=z.number().int().nonnegative();
const usage=(limits:{contextTokens:number;outputTokens:number})=>z.object({
 prompt_tokens:count.max(limits.contextTokens),completion_tokens:count.max(limits.outputTokens),total_tokens:count,
 prompt_tokens_details:z.object({cached_tokens:count.optional()}).optional(),
 completion_tokens_details:z.object({reasoning_tokens:count.optional()}).optional(),
}).refine(u=>u.total_tokens===u.prompt_tokens+u.completion_tokens)
 .refine(u=>(u.prompt_tokens_details?.cached_tokens??0)<=u.prompt_tokens)
 .refine(u=>(u.completion_tokens_details?.reasoning_tokens??0)<=u.completion_tokens);
export async function accountChat(db:ChatDatabase,id:string,result:unknown,limits:{contextTokens:number;outputTokens:number}=L){
 const parsed=z.object({usage:usage(limits)}).safeParse(result);
 // Unknown, failed or malformed usage remains charged at the full reservation indefinitely.
 if(!parsed.success){await db.prepare("UPDATE relay_chat_calls SET status='usage_unknown' WHERE id=? AND status='reserved'").bind(id).run();return false}
 const u=parsed.data.usage,cached=u.prompt_tokens_details?.cached_tokens??0;
 // Completion tokens already include reasoning. Cached input is discounted only when explicitly reported.
 const cost=Math.ceil((u.prompt_tokens-cached)*CHAT_PRICES.input+cached*CHAT_PRICES.cachedInput+u.completion_tokens*CHAT_PRICES.output);
 await db.prepare(`UPDATE relay_chat_calls SET status='accounted',input_tokens=?,output_tokens=?,actual_microusd=? WHERE id=? AND status='reserved'`)
 .bind(u.prompt_tokens,u.completion_tokens,cost,id).run();
 return true;
}
