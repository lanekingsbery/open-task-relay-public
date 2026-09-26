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
export const reviewQualifiedWhere=`t.moderation_status='approved' AND t.accepted_result_id IS NULL
 AND t.status NOT IN ('closed','premise_stale','completed')
 AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 AND NOT EXISTS(SELECT 1 FROM tasks child WHERE child.parent_id=t.id AND child.status!='completed')
 AND ${resultAcceptanceWhere}`;
// Review IDs remain in the concurrency token and recorded judgment for audit.
// They are not the hold scope: only a new result, contract revision, or explicit
// owner reopening can release a substantive failure hold.
export const ownerReviewState=`json_array(coalesce(json_extract(t.protocol,'$.revision'),1),
 (SELECT json_group_array(id) FROM (SELECT v.id FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
 WHERE v.result_id=r.id AND ${qualifyingReviewWhere} ORDER BY v.id)))`;
export const ownerVerificationFailedWhere=`coalesce((SELECT ov.outcome FROM owner_verifications ov
 WHERE ov.result_id=r.id AND json_extract(ov.review_state,'$[0]')=coalesce(json_extract(t.protocol,'$.revision'),1) ORDER BY ov.id DESC LIMIT 1),'')='failed'`;
// Compatibility field: mechanical gates plus no active owner hold. Never a finding of completion.
export const acceptanceReadyWhere=`${reviewQualifiedWhere} AND NOT (${ownerVerificationFailedWhere})`;
export const taskAcceptanceReady=`EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${acceptanceReadyWhere})`;
export const readinessNotice='Review qualification checks recorded review assertions and structural gates only; it does not establish substantive completion. The owner must verify the full completion contract before explicitly accepting.';
export const resultReviewFields=`(${reviewQualifiedWhere}) AS review_qualified, (${acceptanceReadyWhere}) AS acceptance_ready,
 (${ownerVerificationFailedWhere}) AS owner_verification_failed, ${ownerReviewState} AS owner_review_state`;
export const taskReviewFields=`${taskAcceptanceReady} AS acceptance_ready,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${reviewQualifiedWhere}) AS review_qualified,
 EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND t.accepted_result_id IS NULL AND (${ownerVerificationFailedWhere})) AS owner_verification_failed,
 (SELECT count(*) FROM verifications v JOIN results r ON r.id=v.result_id JOIN agents reviewer ON reviewer.id=v.author
 WHERE r.task_id=t.id AND ${independentReviewWhere}) AS independent_check_count`;
type ReadinessFields={acceptance_ready?:unknown;review_qualified?:unknown;owner_verification_failed?:unknown;owner_attention_required?:boolean;readiness_notice?:string};
export function normalizeReadiness<T extends ReadinessFields>(row:T){
 if(!('acceptance_ready' in row))return row;
 for(const key of ['acceptance_ready','review_qualified','owner_verification_failed'] as const)row[key]=Boolean(row[key]);
 row.owner_attention_required=Boolean(row.acceptance_ready);
 row.readiness_notice=readinessNotice;
 return row;
}
