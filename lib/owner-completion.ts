import {z} from 'zod';
import {all,one,ApiError,event,type DB,type TaskRecord,type ResultRecord,type Readiness} from './commons.ts';
import {ownerCheckAvailableWhere,finishingSourceWhere} from './finishing-review.ts';
import {independentReviewWhere} from './independence.ts';
import {ownerVerificationFailedWhere,ownerReviewState} from './acceptance-readiness.ts';
import {guard} from './relay-operator-store.ts';
import {trackTaskChange} from './indexnow.ts';
import {validateOutput} from './commons.ts';

export async function completionReviews(db:DB,resultId:string){
 return all<{id:string;result_id:string;content:string;completeness:string;author_name:string;evidence:string[]}>(db,`SELECT v.*,reviewer.name author_name FROM results r JOIN tasks t ON t.id=r.task_id
 JOIN verifications v ON ${finishingSourceWhere} JOIN results source ON source.id=v.result_id
 JOIN tasks st ON st.id=source.task_id JOIN agents reviewer ON reviewer.id=v.author
 WHERE r.id=? AND source.task_id=t.id AND v.verdict='agree' AND NOT EXISTS(SELECT 1 FROM verifications challenge WHERE challenge.result_id=source.id AND challenge.verdict='dispute')
 AND ${independentReviewWhere.replaceAll('r.author','source.author').replaceAll('t.creator','st.creator').replaceAll('t.assignee','st.assignee')}
 ORDER BY v.id`,resultId);
}
const schema=z.object({task_id:z.string().uuid(),result_id:z.string().uuid(),reason:z.string().trim().min(20).max(1000),criteria_checked:z.literal(true),
 conclusion:z.string().trim().min(20).max(420).optional(),expected_review_state:z.string().optional(),review_basis:z.string().trim().min(20).max(1000),review_ids:z.array(z.string().uuid()).min(1).max(40)}).strict();
/** Only the authenticated moderation route or exact compiled owner-release decisions call this.
 * Owner checks are explicit judgments, not independent reviews or an automatic score. */
export async function acceptOwnerCompletion(db:DB,input:unknown){
 const p=schema.parse(input);
 return trackTaskChange(db,p.task_id,async()=>{
  const t=await one<TaskRecord & {protocol?:unknown}>(db,'SELECT * FROM tasks WHERE id=?',p.task_id);
  if(t?.accepted_result_id===p.result_id)return t;
  const raw=await db.prepare('SELECT protocol,updated_at FROM tasks WHERE id=?').bind(p.task_id).first<{protocol:string|null;updated_at:string}>();
  const r=await one<ResultRecord>(db,'SELECT * FROM results WHERE id=? AND task_id=?',p.result_id,p.task_id);
  if(!t||!raw||!r)throw new ApiError(404,'NOT_FOUND','Completion candidate not found.');
  const gate=await one<Readiness & {state:string;available:number}>(db,`SELECT (${ownerCheckAvailableWhere}) available,(${ownerVerificationFailedWhere}) owner_verification_failed,${ownerReviewState} state FROM results r JOIN tasks t ON t.id=r.task_id WHERE r.id=?`,r.id);
  if(gate?.owner_verification_failed)throw new ApiError(409,'OWNER_VERIFICATION_FAILED','Reopen this unchanged candidate with a public reason before accepting.');
  if(!gate?.available)throw new ApiError(409,'UNVERIFIED','Inspect the latest available candidate, its independent evidence checks and blockers.');
  if(p.expected_review_state!==undefined&&p.expected_review_state!==gate.state)throw new ApiError(409,'STALE_REVIEW_STATE','Reviews changed. Inspect them before accepting.');
  if(!validateOutput(t,r.content).passed)throw new ApiError(409,'OUTPUT_INVALID','Candidate does not match the output contract.');
  const reviews=await completionReviews(db,r.id);
  if(p.review_ids.some(id=>!reviews.some(v=>v.id===id)))throw new ApiError(409,'UNVERIFIED','Every cited check must be an eligible independent agreement on the candidate or its recorded sources.');
  const selected=[...new Set(p.review_ids)].sort(),key=crypto.randomUUID(),stamp=new Date().toISOString();
  const [check,clear]=guard(db,`EXISTS(SELECT 1 FROM results r JOIN tasks t ON t.id=r.task_id WHERE r.id=? AND t.id=? AND t.protocol IS ? AND t.updated_at=?
 AND (${ownerCheckAvailableWhere}) AND NOT (${ownerVerificationFailedWhere}) AND ${ownerReviewState}=?)
 AND (SELECT count(*) FROM verifications v JOIN results source ON source.id=v.result_id JOIN tasks st ON st.id=source.task_id
 JOIN agents reviewer ON reviewer.id=v.author JOIN results r ON r.id=? JOIN tasks t ON t.id=r.task_id
 WHERE v.id IN (SELECT value FROM json_each(?)) AND source.task_id=t.id AND ${finishingSourceWhere} AND v.verdict='agree' AND NOT EXISTS(SELECT 1 FROM verifications challenge WHERE challenge.result_id=source.id AND challenge.verdict='dispute')
 AND ${independentReviewWhere.replaceAll('r.author','source.author').replaceAll('t.creator','st.creator').replaceAll('t.assignee','st.assignee')})=?`,
 [r.id,t.id,raw.protocol,raw.updated_at,gate.state,r.id,JSON.stringify(selected),selected.length]);
  await db.batch([check,
   ...(p.conclusion?[db.prepare('INSERT INTO task_conclusions(result_id,conclusion,actor,created_at) VALUES (?,?,?,?)').bind(r.id,p.conclusion,'site_owner',stamp)]:[]),
   db.prepare('INSERT INTO owner_completion_checks(result_id,task_id,created_at,revision,actor,review_ids,reason) VALUES (?,?,?,?,?,?,?)')
    .bind(r.id,t.id,stamp,t.revision,'site_owner',JSON.stringify(selected),p.review_basis),
   db.prepare("UPDATE tasks SET status='completed',accepted_result_id=?,updated_at=? WHERE id=?").bind(r.id,stamp,t.id),
   db.prepare('INSERT INTO acceptance_snapshots(result_id,task_id,created_at,revision,protocol) VALUES (?,?,?,?,?)').bind(r.id,t.id,stamp,t.revision,raw.protocol||'{}'),
   db.prepare("INSERT INTO notifications(result_id,task_id,status,created_at) SELECT ?,?,'pending',? WHERE EXISTS(SELECT 1 FROM human_problems WHERE task_id=?) ON CONFLICT(result_id) DO NOTHING").bind(r.id,t.id,stamp,t.id),
   event(db,t.creator,'completed','tasks',t.id,t.title),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) VALUES (?,?,NULL,'acceptance explanation','tasks',?,?)").bind('acceptance:'+key,stamp,t.id,p.reason),clear]);
  return one<TaskRecord>(db,'SELECT * FROM tasks WHERE id=?',t.id);
 });
}
