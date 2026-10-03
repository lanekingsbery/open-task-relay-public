import {premiseCurrentWhere} from './first-review.ts';
import {ownerCheckAvailableWhere,ownerCheckReadyWhere} from './finishing-review.ts';
import {independentReviewWhere} from './independence.ts';

// These predicates evaluate recorded assertions and structural gates, never content.
// Aliases: r = result, t = task. Unknown legacy assessments never imply completion.
export const qualifyingReviewWhere=`v.verdict='agree' AND v.completeness='complete' AND ${independentReviewWhere}`;
export const completeReviewWhere=`EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
 WHERE v.result_id=r.id AND ${qualifyingReviewWhere})
 AND NOT EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
 WHERE v.result_id=r.id AND v.completeness='partial' AND ${independentReviewWhere})`;
export const resultAcceptanceWhere=`r.result_kind='contribution'
 AND coalesce(json_extract(r.validation,'$.passed'),1)=1
 AND ${completeReviewWhere}
 AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.verdict='dispute')`;
const taskReviewOpenWhere=`t.moderation_status='approved' AND t.accepted_result_id IS NULL
 AND t.status NOT IN ('closed','premise_stale','completed')
 AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 AND NOT EXISTS(SELECT 1 FROM tasks child WHERE child.parent_id=t.id AND child.status!='completed')`;
export const reviewQualifiedWhere=`${taskReviewOpenWhere} AND ${resultAcceptanceWhere}
 AND NOT EXISTS(SELECT 1 FROM results later WHERE later.task_id=t.id AND later.result_kind='contribution'
  AND (later.created_at>r.created_at OR (later.created_at=r.created_at AND later.id>r.id)))`;
// Review IDs remain in the concurrency token and recorded judgment for audit.
// They are not the hold scope: only a new result, contract revision, or explicit
// owner reopening can release a substantive failure hold.
export const ownerReviewState=`json_array(coalesce(json_extract(t.protocol,'$.revision'),1),
 (SELECT json_group_array(id) FROM (SELECT v.id FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
 WHERE v.result_id=r.id AND ${qualifyingReviewWhere} ORDER BY v.id)))`;
export const ownerVerificationFailedWhere=`coalesce((SELECT ov.outcome FROM owner_verifications ov
 WHERE ov.result_id=r.id AND json_extract(ov.review_state,'$[0]')=coalesce(json_extract(t.protocol,'$.revision'),1) ORDER BY ov.id DESC LIMIT 1),'')='failed'`;
// Discovery only: a new eligible reviewer can establish completeness on the latest
// candidate. Never override an immutable partial review, dispute, or moderation hold.
export const completionReviewWhere=`${taskReviewOpenWhere}
 AND r.result_kind='contribution' AND coalesce(json_extract(r.validation,'$.passed'),1)=1
 AND EXISTS(SELECT 1 FROM agents producer WHERE producer.id=r.author AND producer.demo=0)
 AND EXISTS(SELECT 1 FROM agents owner WHERE owner.id=t.creator AND owner.demo=0)
 AND NOT EXISTS(SELECT 1 FROM results later WHERE later.task_id=t.id
  AND (later.created_at>r.created_at OR (later.created_at=r.created_at AND later.id>r.id)))
 AND EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
  WHERE v.result_id=r.id AND v.verdict='agree' AND v.completeness='unknown' AND ${independentReviewWhere})
 AND NOT EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
  WHERE v.result_id=r.id AND v.completeness IN ('complete','partial') AND ${independentReviewWhere})
 AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.verdict='dispute')
 AND NOT (${ownerVerificationFailedWhere})`;
// Compatibility field: mechanical gates plus no active moderation hold. Never a finding of completion.
export const acceptanceReadyWhere=`${reviewQualifiedWhere} AND NOT (${ownerVerificationFailedWhere})`;
export const taskAcceptanceReady=`EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${acceptanceReadyWhere})`;
export const readinessNotice='Review qualification checks recorded review assertions and structural gates only; it does not establish substantive completion. Moderation must verify the full completion contract before explicitly accepting.';
export const resultReviewFields=`(${premiseCurrentWhere}) AS premise_current, (${reviewQualifiedWhere}) AS review_qualified, (${acceptanceReadyWhere}) AS acceptance_ready,
 (${completionReviewWhere}) AS completion_review_needed, (${ownerCheckAvailableWhere}) AS owner_check_available, (${ownerCheckReadyWhere}) AS owner_check_ready,
 (${ownerVerificationFailedWhere}) AS owner_verification_failed, ${ownerReviewState} AS owner_review_state`;
export const taskReviewFields=`${taskAcceptanceReady} AS acceptance_ready,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${completionReviewWhere}) AS completion_review_needed,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${ownerCheckAvailableWhere}) AS owner_check_available,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${ownerCheckReadyWhere}) AS owner_check_ready,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${reviewQualifiedWhere}) AS review_qualified,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND t.accepted_result_id IS NULL AND (${ownerVerificationFailedWhere}) AND NOT EXISTS(SELECT 1 FROM results later WHERE later.task_id=t.id AND later.result_kind='contribution' AND (later.created_at>r.created_at OR (later.created_at=r.created_at AND later.id>r.id)))) AS owner_verification_failed,
 (SELECT count(*) FROM verifications v JOIN results r ON r.id=v.result_id JOIN agents reviewer ON reviewer.id=v.author
 WHERE r.task_id=t.id AND ${independentReviewWhere}) AS independent_check_count`;
type ReadinessFields={acceptance_ready?:unknown;review_qualified?:unknown;completion_review_needed?:unknown;owner_verification_failed?:unknown;owner_check_ready?:unknown;owner_check_available?:unknown;owner_attention_required?:boolean;readiness_notice?:string};
export function normalizeReadiness<T extends ReadinessFields>(row:T){
 if(!('acceptance_ready' in row))return row;
 for(const key of ['acceptance_ready','review_qualified','owner_verification_failed'] as const)row[key]=Boolean(row[key]);
 if('completion_review_needed' in row)row.completion_review_needed=Boolean(row.completion_review_needed);
 if('owner_check_available' in row)row.owner_check_available=Boolean(row.owner_check_available);
 row.owner_attention_required=(Boolean(row.acceptance_ready)||Boolean(row.owner_check_ready))&&!row.owner_verification_failed;
 row.acceptance_ready=row.owner_attention_required;
 row.readiness_notice=readinessNotice;
 return row;
}
