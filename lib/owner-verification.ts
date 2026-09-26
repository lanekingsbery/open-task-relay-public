import {z} from 'zod';
import {type DB,ApiError,one,all,event} from './commons.ts';
import {ownerReviewState,ownerVerificationFailedWhere} from './acceptance-readiness.ts';

export const ownerVerificationSchema=z.object({result_id:z.string().uuid(),outcome:z.enum(['failed','reopened']),reason:z.string().trim().min(20).max(1000),expected_review_state:z.string().min(1).max(16000)}).strict();
export const ownerVerificationHistory=(db:DB,resultId:string)=>all(db,'SELECT * FROM owner_verifications WHERE result_id=? ORDER BY id DESC LIMIT 100',resultId);
// agentId=null is allowed only from the authenticated site-owner route.
export async function recordOwnerVerification(db:DB,taskId:string,input:unknown,agentId:string|null){
 const p=ownerVerificationSchema.parse(input);
 const task=await one(db,'SELECT t.*,a.managed,a.demo FROM tasks t JOIN agents a ON a.id=t.creator WHERE t.id=?',taskId);
 if(!task)throw new ApiError(404,'NOT_FOUND','Task not found');
 if(agentId?task.creator!==agentId:!task.managed||task.demo)throw new ApiError(403,'FORBIDDEN','Only the task creator or the site owner for curated tasks may record owner verification');
 if(task.accepted_result_id)throw new ApiError(409,'ALREADY_ACCEPTED','Historical acceptance cannot be changed by owner verification');
 const state=await one(db,`SELECT ${ownerReviewState} AS review_state,(${ownerVerificationFailedWhere}) AS failed FROM results r JOIN tasks t ON t.id=r.task_id WHERE r.id=? AND t.id=? AND r.result_kind='contribution'`,p.result_id,taskId);
 if(!state)throw new ApiError(422,'RESULT_MISMATCH','Select a contribution belonging to this task');
 if(state.review_state!==p.expected_review_state)throw new ApiError(409,'STALE_REVIEW_STATE','The contract or qualifying reviews changed. Inspect the candidate again.');
 if(p.outcome==='reopened'&&!state.failed)throw new ApiError(409,'NO_OWNER_HOLD','No current owner verification failure to reopen');
 const key=crypto.randomUUID();
 await db.batch([
  db.prepare(`INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents a ON a.id=t.creator WHERE r.id=? AND t.id=? AND t.accepted_result_id IS NULL AND ${ownerReviewState}=? AND ${agentId?'t.creator=?':'a.managed=1 AND a.demo=0'}) THEN 1 ELSE 0 END`).bind(key,p.result_id,taskId,p.expected_review_state,...(agentId?[agentId]:[])),
  db.prepare('INSERT INTO owner_verifications(created_at,result_id,review_state,actor,outcome,reason) VALUES(?,?,?,?,?,?)').bind(new Date().toISOString(),p.result_id,p.expected_review_state,agentId||'site_owner',p.outcome,p.reason),
  event(db,agentId,'owner verification '+p.outcome,'tasks',taskId,p.result_id+': '+p.reason),
  db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(key)
 ]);
 return {result_id:p.result_id,owner_verification_history:await ownerVerificationHistory(db,p.result_id)};
}
