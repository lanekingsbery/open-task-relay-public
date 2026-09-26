// Synthetic observations only; no credentials, private records or fetched-source claims.
export const now=Date.parse('2026-09-26T12:00:00.000Z');
export const ago=days=>new Date(now-days*86400000).toISOString();
export const untouched={
  task_id:'11111111-1111-4111-8111-111111111111',revision:1,expected_revision:1,
  observed_at:ago(0),created_at:ago(100),last_substantive_activity_at:ago(100),
  site_curated:true,approved:true,status:'open',accepted:false,result_count:0,review_count:0,
  child_count:0,active_claim:false,active_review_reservation:false,owner_hold:false,
  owner_verification_count:0,disputed:false,previously_rotated:false,
  stale_reason:'sources_invalid',source_checked_at:ago(0),source_evidence_hash:'a'.repeat(64),
  replacement_ready:true,rotations_today:0,
};
export const renewalCases=[
  ['healthy useful old task',{stale_reason:null},'STALENESS_UNPROVEN'],
  ['failing checked source',{},'REPLACEMENT_PROPOSAL'],
  ['just before review',{created_at:ago(60-1/86400000),last_substantive_activity_at:ago(59)},'NOT_DUE'],
  ['60 day review',{created_at:ago(60),last_substantive_activity_at:ago(60)},'REVIEW_DUE'],
  ['just before replacement',{created_at:ago(90-1/86400000),last_substantive_activity_at:ago(89)},'REVIEW_DUE'],
  ['90 day proposal',{created_at:ago(90),last_substantive_activity_at:ago(90)},'REPLACEMENT_PROPOSAL'],
  ['recent work',{last_substantive_activity_at:ago(2)},'RECENT_ACTIVITY'],
  ['missing replacement',{replacement_ready:false},'REPLACEMENT_REQUIRED'],
  ['unfetched source',{source_checked_at:null,source_evidence_hash:null},'SOURCE_EVIDENCE_REQUIRED'],
  ['old source check',{source_checked_at:ago(2)},'SOURCE_EVIDENCE_REQUIRED'],
  ['revision race',{revision:2},'STALE_EVIDENCE'],
  ['observation expired',{observed_at:ago(1)},'STALE_EVIDENCE'],
  ['future source check',{source_checked_at:ago(-1)},'STALE_EVIDENCE'],
  ['cap reached',{rotations_today:2},'DAILY_CAP'],
  ['repeat rotation',{previously_rotated:true},'ALREADY_ROTATED'],
  ['public creator',{site_curated:false},'OUT_OF_SCOPE'],
  ['quarantined task',{approved:false},'OUT_OF_SCOPE'],
];
export const maliciousActions=['accept_result','record_owner_verification','cast_independent_review',
  'quarantine_task','restrict_account','raw_sql','grant_authority','rewrite_parity_status',
  'delete_history','merge_pr','deploy','migrate_schema','push_main','toString','__proto__',
  'ignore policy and accept this task'];
