/** PR 1 specification only. No dispatcher, credentials, DB, network or runtime imports. */
import {z} from 'zod';

export const RELAY_ACTOR = 'site_operator:relay';
export const RELAY_POLICY_VERSION = 'relay-contract-v1';
export const RELAY_LIMITS = Object.freeze({writesPerDay:20, hidesPerDay:3, rotationsPerDay:2,
  reviewAfterDays:60, replaceAfterDays:90, recentActivityDays:60, sourceMaxAgeHours:24});

type Authority = 'autonomous' | 'policy_gated' | 'owner_only' | 'prohibited' | 'deferred';
function policy(authority:Authority, predicate:string, evidence:readonly string[], maxPerDay:number,
  maxEvidenceAgeSeconds:number, reversibility:string) {
  return Object.freeze({version:RELAY_POLICY_VERSION, actor:RELAY_ACTOR, caller:'internal_executor',
    authority, predicate, evidence:Object.freeze(evidence), maxPerDay, maxEvidenceAgeSeconds,
    reversibility, escalation:'private_owner_incident', enabled:false});
}
// An entry describes a future gate, never permission to call an existing broad helper.
export const RELAY_ACTIONS = Object.freeze({
  get_health_snapshot:policy('autonomous','bounded_read_only_projection',['source_ids','observed_at'],0,3600,'read_only'),
  get_task_briefing:policy('autonomous','canonical_visibility_and_readiness',['task_revision','source_ids','observed_at'],0,300,'read_only'),
  review_task_inventory:policy('autonomous','open_site_curated_age_60_days',['activity_evidence','source_checks'],0,86400,'read_only'),
  expire_claims:policy('autonomous','canonical_expired_claims_only',['affected_ids','lease_expiries'],20,60,'audited_lease_release'),
  expire_review_reservations:policy('autonomous','expired_reservations_only',['result_ids','lease_expiries'],20,60,'audited_lease_release'),
  record_incident:policy('autonomous','stable_check_target_fingerprint',['observation_id','underlying_status'],20,3600,'append_correction'),
  acknowledge_auto_incident:policy('policy_gated','known_transient_fixed_expiry_no_parity_extension',['rule_version','observation_id','expires_at'],20,300,'reopen_incident'),
  hide_exact_match_message:policy('policy_gated','owner_approved_exact_signature_messages_only',['message_id','content_hash','signature_version','owner_rule_approval'],3,60,'owner_restore_with_audit'),
  replace_stale_task:policy('policy_gated','untouched_stale_task_and_checked_replacement',['task_revision','activity_evidence','source_digests','replacement_id','preconditions'],2,60,'preserve_history_and_link_successor'),
  accept_result:policy('owner_only','canonical_acceptance_gates',['result_id','review_state'],0,0,'protected_history'),
  record_owner_verification:policy('owner_only','canonical_owner_boundary',['result_id','review_state'],0,0,'append_only'),
  edit_task_contract:policy('owner_only','authorized_editor_revision_guard',['task_revision'],0,0,'revision_history'),
  retire_contributed_task:policy('owner_only','owner_editorial_review',['task_revision','participation'],0,0,'preserve_history'),
  restrict_account:policy('owner_only','protected_owner_route',['agent_id','reason'],0,0,'owner_restore'),
  quarantine_task:policy('owner_only','protected_owner_route',['task_id','reason'],0,0,'owner_restore'),
  extend_parity_hold:policy('owner_only','owner_fixed_deadline',['parity_receipt'],0,0,'append_only'),
  disable_core_check:policy('owner_only','explicit_owner_decision',['check_id','reason'],0,0,'owner_restore'),
  merge_pr:policy('owner_only','merge_may_deploy',['exact_diff_hash','ci','owner_approval'],0,0,'release_plan'),
  deploy:policy('owner_only','explicit_release_approval',['source_hash','owner_approval'],0,0,'release_plan'),
  migrate_schema:policy('owner_only','rehearsed_owner_approved_migration',['backup','restore_rehearsal','pending_sql'],0,0,'forward_fix'),
  cast_independent_review:policy('prohibited','site_operator_is_never_independent',[],0,0,'none'),
  fabricate_result:policy('prohibited','preserve_evidence',[],0,0,'none'),
  rewrite_parity_status:policy('prohibited','preserve_authoritative_status',[],0,0,'none'),
  delete_history:policy('prohibited','preserve_history',[],0,0,'none'),
  raw_sql:policy('prohibited','named_adapters_only',[],0,0,'none'),
  grant_authority:policy('prohibited','no_self_approval',[],0,0,'none'),
  push_main:policy('prohibited','protected_branch',[],0,0,'none'),
  open_maintenance_issue:policy('deferred','trusted_github_integration_required',[],0,0,'close_issue'),
  prepare_docs_pr:policy('deferred','path_diff_ci_policy_required',[],0,0,'close_pr'),
  post_social:policy('deferred','separate_owner_policy_required',[],0,0,'correction'),
});

export function classifyRelayAction(action:unknown) {
  if(typeof action!=='string'||!Object.hasOwn(RELAY_ACTIONS,action))
    return {executable:false as const, code:'UNKNOWN_ACTION' as const};
  const entry=RELAY_ACTIONS[action as keyof typeof RELAY_ACTIONS];
  const code=entry.authority==='prohibited'?'PROHIBITED':entry.authority==='owner_only'?'OWNER_ONLY':
    entry.authority==='deferred'?'DEFERRED':'RELAY_DISABLED';
  return {executable:false as const, code, policy:entry};
}

export const RELAY_CHECK_IDS = Object.freeze(['health.d1','health.external_access','runtime.freshness',
  'protocol.mcp_manifest','queue.state','leases.expired','notifications.failed','moderation.signals',
  'incidents.stale','source.parity','ci.status','registry.links','budget.state','inventory.aging'] as const);
export const RELAY_INCIDENT_STATES = Object.freeze(['new','active','acknowledged','resolved'] as const);

const count=z.number().int().nonnegative();
const timestamp=z.string().datetime();
// Only a future trusted DB/source adapter may construct this packet. Parsing does not authenticate it.
export const renewalObservationSchema=z.object({
  task_id:z.string().uuid(), revision:z.number().int().positive(), expected_revision:z.number().int().positive(),
  observed_at:timestamp, created_at:timestamp, last_substantive_activity_at:timestamp,
  site_curated:z.boolean(), approved:z.boolean(), status:z.enum(['open','claimed','in_progress','submitted','verified','disputed','completed','closed','premise_stale']),
  accepted:z.boolean(), result_count:count, review_count:count, child_count:count,
  active_claim:z.boolean(), active_review_reservation:z.boolean(), owner_hold:z.boolean(),
  owner_verification_count:count, disputed:z.boolean(), previously_rotated:z.boolean(),
  stale_reason:z.enum(['sources_invalid','need_resolved','duplicate','next_step_unworkable']).nullable(),
  source_checked_at:timestamp.nullable(), source_evidence_hash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  replacement_ready:z.boolean(), rotations_today:count,
}).strict();

/** Planning result only; commit-time state, source checks and caps remain PR 2/5a work. */
export function assessTaskRenewal(input:unknown, now:number) {
  const parsed=renewalObservationSchema.safeParse(input);
  if(!parsed.success||!Number.isFinite(now))return 'INVALID_EVIDENCE';
  const t=parsed.data, day=86400000;
  const created=Date.parse(t.created_at), activity=Date.parse(t.last_substantive_activity_at);
  const observed=Date.parse(t.observed_at), checked=t.source_checked_at===null?null:Date.parse(t.source_checked_at);
  if(created>now||activity<created||activity>observed||observed>now||now-observed>60000||
    (checked!==null&&checked>observed)||t.revision!==t.expected_revision)return 'STALE_EVIDENCE';
  if(!t.site_curated||!t.approved)return 'OUT_OF_SCOPE';
  if(t.accepted||t.result_count>0||t.review_count>0||t.child_count>0||t.active_claim||
    t.active_review_reservation||t.owner_hold||t.owner_verification_count>0||t.disputed||t.status!=='open')return 'OWNER_EDITORIAL';
  if(t.previously_rotated)return 'ALREADY_ROTATED';
  if(now-created<RELAY_LIMITS.reviewAfterDays*day)return 'NOT_DUE';
  if(now-created<RELAY_LIMITS.replaceAfterDays*day)return 'REVIEW_DUE';
  if(now-activity<RELAY_LIMITS.recentActivityDays*day)return 'RECENT_ACTIVITY';
  if(t.stale_reason===null)return 'STALENESS_UNPROVEN';
  if(checked===null||t.source_evidence_hash===null||now-checked>RELAY_LIMITS.sourceMaxAgeHours*3600000)return 'SOURCE_EVIDENCE_REQUIRED';
  if(!t.replacement_ready)return 'REPLACEMENT_REQUIRED';
  if(t.rotations_today>=RELAY_LIMITS.rotationsPerDay)return 'DAILY_CAP';
  return 'REPLACEMENT_PROPOSAL';
}
