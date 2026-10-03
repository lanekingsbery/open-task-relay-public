import {independentReviewWhere} from './independence.ts';
// A handoff repairs the premise without changing the completion contract.
export const premiseCurrentWhere=`r.contract_revision=coalesce(json_extract(t.protocol,'$.revision'),1)
 AND NOT EXISTS(SELECT 1 FROM task_handoffs h WHERE h.task_id=t.id AND h.created_at>=r.created_at)`;
// Result-level first-review eligibility. Only t (task) and r (result) aliases
// are required, so listings, detail, counts and transactional guards agree.
// Any eligible review counts, including partial, unknown and dispute.
export const firstReviewWhere=`t.moderation_status='approved' AND t.accepted_result_id IS NULL
 AND t.status NOT IN ('closed','premise_stale')
 AND EXISTS(SELECT 1 FROM agents first_owner WHERE first_owner.id=t.creator AND first_owner.demo=0)
 AND EXISTS(SELECT 1 FROM agents first_producer WHERE first_producer.id=r.author AND first_producer.demo=0)
 AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 AND (r.result_kind!='premise_stale' OR (${premiseCurrentWhere}))
 AND (r.result_kind='premise_stale' OR NOT EXISTS(SELECT 1 FROM results later WHERE later.task_id=t.id AND later.result_kind='contribution' AND (later.created_at>r.created_at OR (later.created_at=r.created_at AND later.id>r.id))))
 AND NOT EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author WHERE v.result_id=r.id AND ${independentReviewWhere})`;
export function reviewAvailability<T extends {first_review_eligible?:boolean|number;review_availability?:string}>(result:T,task:{status?:string}){
 result.first_review_eligible=Boolean(result.first_review_eligible);
 result.review_availability=task.status==='closed'?'historical':result.first_review_eligible?'needs_first_review':'not_in_first_review_queue';
 return result;
}
