import {independentReviewWhere} from './independence.ts';
// Earlier reviews keep their exact scope. This is availability for a human
// completion check, never an assertion that Relay's new text was independently reviewed.
export const finishingSourceWhere=`(v.result_id=r.id OR EXISTS(
 SELECT 1 FROM relay_finishing f JOIN json_each(f.source_result_ids) src
 WHERE f.candidate_id=r.id AND src.value=v.result_id AND f.status='complete'))`;
export const ownerCheckAvailableWhere=`t.moderation_status='approved' AND t.accepted_result_id IS NULL
 AND t.status NOT IN ('closed','premise_stale','completed') AND r.result_kind='contribution'
 AND coalesce(json_extract(r.validation,'$.passed'),1)=1
 AND NOT EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author WHERE v.result_id=r.id AND v.completeness='partial' AND ${independentReviewWhere})
 AND EXISTS(SELECT 1 FROM agents creator WHERE creator.id=t.creator AND creator.managed=1 AND creator.demo=0)
 AND NOT EXISTS(SELECT 1 FROM tasks child WHERE child.parent_id=t.id AND child.status!='completed')
 AND NOT EXISTS(SELECT 1 FROM verifications disputed WHERE disputed.result_id=r.id AND disputed.verdict='dispute')
 AND NOT EXISTS(SELECT 1 FROM results later WHERE later.task_id=t.id AND later.result_kind='contribution'
  AND (later.created_at>r.created_at OR (later.created_at=r.created_at AND later.id>r.id)))
 AND EXISTS(SELECT 1 FROM verifications v JOIN results source ON source.id=v.result_id
 JOIN agents reviewer ON reviewer.id=v.author JOIN tasks st ON st.id=source.task_id
 WHERE source.task_id=t.id AND ${finishingSourceWhere} AND v.verdict='agree' AND NOT EXISTS(SELECT 1 FROM verifications challenge WHERE challenge.result_id=source.id AND challenge.verdict='dispute')
 AND ${independentReviewWhere.replaceAll('r.author','source.author').replaceAll('t.creator','st.creator').replaceAll('t.assignee','st.assignee')})`;
// Explicit moderation accepted an artifact using these scoped checks. No review
// row is copied, and complete/partial/unknown assertions remain unchanged.
export const ownerCompletionWhere=`EXISTS(SELECT 1 FROM owner_completion_checks oc
 WHERE oc.result_id=r.id AND oc.task_id=t.id AND oc.revision=coalesce(json_extract(t.protocol,'$.revision'),1)
 AND json_array_length(oc.review_ids)>0 AND (SELECT count(*) FROM json_each(oc.review_ids) ids JOIN verifications v ON v.id=ids.value
 JOIN results source ON source.id=v.result_id JOIN agents reviewer ON reviewer.id=v.author
 JOIN tasks st ON st.id=source.task_id WHERE source.task_id=t.id AND ${finishingSourceWhere}
 AND v.verdict='agree' AND NOT EXISTS(SELECT 1 FROM verifications challenge WHERE challenge.result_id=source.id AND challenge.verdict='dispute') AND ${independentReviewWhere.replaceAll('r.author','source.author').replaceAll('t.creator','st.creator').replaceAll('t.assignee','st.assignee')})=json_array_length(oc.review_ids))`;

export const ownerCheckReadyWhere=`(${ownerCheckAvailableWhere}) AND (
 EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author WHERE v.result_id=r.id AND v.verdict='agree' AND v.completeness='complete' AND ${independentReviewWhere})
 OR EXISTS(SELECT 1 FROM relay_finishing f WHERE f.task_id=t.id AND f.status='complete' AND ((f.candidate_id=r.id AND json_extract(f.decision_json,'$.owner_ready')=1) OR (f.candidate_id IS NULL AND json_extract(f.decision_json,'$.outcome')='ready_for_owner_check' AND r.id IN (SELECT value FROM json_each(f.source_result_ids))))))`;
