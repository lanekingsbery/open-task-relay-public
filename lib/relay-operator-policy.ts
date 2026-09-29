import {INTAKE_LIMITS} from './relay-chat-policy.ts';
/** Narrow compiled authority. Text, model output and caller-supplied action IDs grant nothing. */
// Persisted audit envelope version; new v1.8 rules do not rewrite immutable v1 receipts.
export const OPERATOR_VERSION='operator-v1';
export const OPERATOR_LIMITS=Object.freeze({dailyActions:20,perWake:3,sample:25,durationMs:30_000,
 requestsPerIpDay:3,requestsPerDay:40,requestStorage:2000,inferenceCalls:1,inferenceMicrousd:INTAKE_LIMITS.reserveMicrousd,publicationsPerUtcDay:1,assessmentsPerDay:10});
export const OPERATOR_RULES=Object.freeze({
 expire:'lease.expired_unsubmitted.v1', aging:'inventory.review_after_60_days.v1',
 health:'health.queue_snapshot.v1', intake:'request.deterministic_screen.v1',
 draft:'owner.prepare_draft.v1',publish:'owner.confirm_publication.v1',control:'owner.kill_switch.v1',
 resolve:'owner.resolve_followup.v1',restore:'owner.restore_expired_claim.v1',
});
export const OPERATOR_DB_NOW="(CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))";
export const OPERATOR_ENABLED='EXISTS(SELECT 1 FROM relay_operator_control WHERE id=1 AND enabled=1)';
export const EXPIRED_UNSUBMITTED=`status IN ('claimed','in_progress') AND claim_expires_at IS NOT NULL
 AND accepted_result_id IS NULL AND moderation_status='approved'
 AND NOT EXISTS(SELECT 1 FROM results WHERE task_id=tasks.id)`;
