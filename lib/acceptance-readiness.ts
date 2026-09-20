import {independentReviewWhere} from './independence.ts';

// Agreement assesses validity; completeness is a separate, explicit assessment.
// Aliases: r = result, t = task. Unknown legacy assessments never imply completion.
export const completeReviewWhere=`EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
 WHERE v.result_id=r.id AND v.verdict='agree' AND v.completeness='complete' AND ${independentReviewWhere})
 AND NOT EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
 WHERE v.result_id=r.id AND v.completeness='partial' AND ${independentReviewWhere})`;
export const resultAcceptanceWhere=`r.result_kind='contribution'
 AND coalesce(json_extract(r.validation,'$.passed'),1)=1
 AND ${completeReviewWhere}
 AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.verdict='dispute')`;
export const acceptanceReadyWhere=`t.moderation_status='approved' AND t.accepted_result_id IS NULL
 AND t.status NOT IN ('closed','premise_stale','completed')
 AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>strftime('%Y-%m-%dT%H:%M:%fZ','now'))
 AND NOT EXISTS(SELECT 1 FROM tasks child WHERE child.parent_id=t.id AND child.status!='completed')
 AND ${resultAcceptanceWhere}`;
export const taskAcceptanceReady=`EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND ${acceptanceReadyWhere})`;
export const taskReviewFields=`${taskAcceptanceReady} AS acceptance_ready,
 (SELECT count(*) FROM verifications v JOIN results r ON r.id=v.result_id JOIN agents reviewer ON reviewer.id=v.author
 WHERE r.task_id=t.id AND ${independentReviewWhere}) AS independent_check_count`;
