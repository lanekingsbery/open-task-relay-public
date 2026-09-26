import {firstReviewWhere} from './first-review.ts';
import {z} from 'zod';
import {type DB,ApiError,all,one,event,consensus} from './commons.ts';
import {reviewIndependence,independentReviewWhere} from './independence.ts';

export const reviewerEligibility='Use a different, non-site-run agent that is neither creator, assignee nor author, and does not share a declared operator with them.';
export const reviewClaimSchema=z.object({result_id:z.string().uuid(),minutes:z.number().int().min(1).max(15).default(10)}).strict();
export const reviewReleaseSchema=z.object({result_id:z.string().uuid()}).strict();
export function reviewState(result:any,task:any){
 if(task.accepted_result_id===result.id)return result.consensus?.dispute?'accepted_challenged':'accepted';
 if(task.accepted_result_id||result.result_kind==='premise_stale'&&result.contract_revision!==task.revision)return 'superseded';
 if(result.consensus?.dispute)return 'needs_revision';
 if(result.consensus?.votes?.some((v:any)=>v.verdict==='agree'&&v.independence?.eligible_for_independent_review))return result.result_kind==='premise_stale'?'premise_stale':(result.review_qualified??result.acceptance_ready)?'reviewed':'reviewed_incomplete';
 if(result.review_claim&&result.review_claim.expires_at>new Date().toISOString())return 'under_review';
 return 'awaiting_review';
}
export async function reviewQueue(db:DB,limit=20,offset=0,taskId?:string){
 const stamp=new Date().toISOString(),filter=taskId?' AND t.id=?':'',args=[stamp,...(taskId?[taskId]:[])];
 const from=`FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator JOIN agents producer ON producer.id=r.author LEFT JOIN review_claims c ON c.result_id=r.id AND c.expires_at>? WHERE ${firstReviewWhere}${filter}`;
 const [counts,items]=await Promise.all([one(db,`SELECT count(*) AS total,count(c.result_id) AS under_review,min(r.created_at) AS oldest_waiting_at ${from}`,...args),
 all(db,`SELECT r.id AS result_id,r.task_id,r.result_kind,r.created_at,r.author,producer.name AS author_name,t.title AS task_title,t.creator,t.assignee,c.reviewer,c.expires_at AS review_expires_at ${from} ORDER BY r.created_at,r.id LIMIT ? OFFSET ?`,...args,limit,offset)]);
 return {...counts,awaiting_review:counts.total-counts.under_review,eligibility:reviewerEligibility,items:items.map((r:any)=>({...r,review_status:r.reviewer?'under_review':'awaiting_review',result_url:'/tasks/'+r.task_id+'#result-'+r.result_id,review_endpoint:'/api/tasks/'+r.task_id+'/verifications',claim_endpoint:'/api/tasks/'+r.task_id+'/review-claim',max_minutes:10})),next_offset:offset+items.length<counts.total?offset+items.length:null};
}
export async function eligibleReviewer(db:DB,agent:any,task:any,result:any){
 const participants=await all(db,'SELECT id,operator FROM agents WHERE id IN (?,?,?)',task.creator,task.assignee,result.author);
 return reviewIndependence({...agent,author:agent.id},participants).eligible_for_independent_review;
}
export async function reserveReview(db:DB,task:any,agent:any,input:unknown,release=false){
 const p=release?reviewReleaseSchema.parse(input):reviewClaimSchema.parse(input);
 const result=await one(db,'SELECT * FROM results WHERE task_id=? AND id=?',task.id,p.result_id);
 if(!result)throw new ApiError(422,'RESULT_MISMATCH','Result does not belong to this task.');
 if(!await eligibleReviewer(db,agent,task,result))throw new ApiError(403,'NOT_INDEPENDENT',reviewerEligibility);
 const stamp=new Date().toISOString();
 if(release){await db.batch([db.prepare('DELETE FROM review_claims WHERE result_id=? AND reviewer=?').bind(result.id,agent.id),event(db,agent.id,'review released','results',result.id,'Review reservation released.')]);return {result_id:result.id,released:true};}
 const votes=await consensus(db,result.id);if(votes.independent_checks)throw new ApiError(409,'ALREADY_REVIEWED','A first independent check is already recorded.');
 if(!await one(db,`SELECT r.id FROM results r JOIN tasks t ON t.id=r.task_id WHERE r.id=? AND ${firstReviewWhere}`,result.id))throw new ApiError(409,'REVIEW_CLOSED','This result is not available for a first review.');
 const expires=new Date(Date.now()+('minutes' in p?Number(p.minutes):10)*60000).toISOString();
 const key=crypto.randomUUID();
 await db.batch([
  reviewGuard(db,key,task.id,result.id,agent.id,true),
  db.prepare(`INSERT INTO review_claims(result_id,reviewer,created_at,expires_at) VALUES(?,?,?,?) ON CONFLICT(result_id) DO UPDATE SET reviewer=excluded.reviewer,created_at=excluded.created_at,expires_at=excluded.expires_at WHERE review_claims.expires_at<=?`).bind(result.id,agent.id,stamp,expires,stamp),
  db.prepare('INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM review_claims WHERE result_id=? AND reviewer=? AND created_at=?) THEN 1 ELSE 0 END').bind(key+':reserved',result.id,agent.id,stamp),
  event(db,agent.id,'review started','results',result.id,'Bounded review reserved until '+expires),
  db.prepare('DELETE FROM mutation_guards WHERE id IN (?,?)').bind(key,key+':reserved')
 ]);
 const row={result_id:result.id,reviewer:agent.id,created_at:stamp,expires_at:expires};
 return {...row,review_status:'under_review'};
}

// Recheck mutable review prerequisites inside the same D1 transaction as the write.
export function reviewGuard(db:DB,key:string,taskId:string,resultId:string,reviewerId:string,reserving=false){
 const independence=independentReviewWhere.replaceAll('v.author','reviewer.id');
 return db.prepare(`INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(
  SELECT 1 FROM tasks t JOIN results r ON r.task_id=t.id JOIN agents reviewer ON reviewer.id=?
  WHERE t.id=? AND r.id=? AND t.moderation_status='approved' AND t.status!='closed'
  AND reviewer.id NOT IN (t.creator,r.author) AND (t.assignee IS NULL OR reviewer.id!=t.assignee)
  AND (reviewer.demo=1 OR reviewer.managed=1 OR (${independence}))
  AND (r.result_kind!='premise_stale' OR r.contract_revision=coalesce(json_extract(t.protocol,'$.revision'),1))
  AND NOT EXISTS(SELECT 1 FROM review_claims c WHERE c.result_id=r.id AND c.expires_at>? AND c.reviewer!=reviewer.id)
  ${reserving?`AND ${firstReviewWhere}`:''}
 ) THEN 1 ELSE 0 END`).bind(key,reviewerId,taskId,resultId,new Date().toISOString());
}
