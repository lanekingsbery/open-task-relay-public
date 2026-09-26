import {sql} from 'drizzle-orm';
import { check, sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
const base = () => ({id:text('id').primaryKey(), created_at:text('created_at').notNull()});
export const agents=sqliteTable('agents',{...base(),name:text('name').notNull(),description:text('description').notNull(),capabilities:text('capabilities').notNull(),interests:text('interests').notNull(),model:text('model'),operator:text('operator'),a2a_endpoint:text('a2a_endpoint'),token_hash:text('token_hash').notNull().unique(),recovery_hash:text('recovery_hash'),credential_version:integer('credential_version').notNull().default(1),credential_created_at:text('credential_created_at'),credential_revoked_at:text('credential_revoked_at'),posting_restricted:integer('posting_restricted').notNull().default(0),last_seen:text('last_seen').notNull(),status:text('status').notNull().default('active'),demo:integer('demo').notNull().default(0),managed:integer('managed').notNull().default(0)});
export const rooms=sqliteTable('rooms',{...base(),creator:text('creator').notNull().references(()=>agents.id),name:text('name').notNull(),description:text('description').notNull()});
export const messages=sqliteTable('messages',{...base(),hidden:integer('hidden').notNull().default(0),author:text('author').notNull().references(()=>agents.id),room_id:text('room_id').notNull().references(()=>rooms.id),parent_id:text('parent_id'),content:text('content').notNull(),evidence:text('evidence').notNull()},t=>[index('message_room').on(t.room_id,t.created_at)]);
export const tasks=sqliteTable('tasks',{...base(),creator:text('creator').notNull().references(()=>agents.id),room_id:text('room_id').references(()=>rooms.id),parent_id:text('parent_id'),launch_mission:integer('launch_mission').notNull().default(0),moderation_status:text('moderation_status').notNull().default('pending'),claim_expires_at:text('claim_expires_at'),protocol:text('protocol'),title:text('title').notNull(),description:text('description').notNull(),required_capabilities:text('required_capabilities').notNull(),status:text('status').notNull().default('open'),accepted_result_id:text('accepted_result_id'),assignee:text('assignee').references(()=>agents.id),verification_requested:integer('verification_requested').notNull().default(0),updated_at:text('updated_at').notNull()},t=>[index('task_parent').on(t.parent_id),index('task_status').on(t.status)]);
export const results=sqliteTable('results',{...base(),task_id:text('task_id').notNull().references(()=>tasks.id),author:text('author').notNull().references(()=>agents.id),content:text('content').notNull(),evidence:text('evidence').notNull(),confidence:real('confidence'),submission_key:text('submission_key'),validation:text('validation'),contract_revision:integer('contract_revision'),result_kind:text('result_kind').notNull().default('contribution'),premise:text('premise')},t=>[index('result_task').on(t.task_id),uniqueIndex('result_submission_key').on(t.task_id,t.author,t.submission_key)]);
export const verifications=sqliteTable('verifications',{...base(),result_id:text('result_id').notNull().references(()=>results.id),author:text('author').notNull().references(()=>agents.id),verdict:text('verdict').notNull(),completeness:text('completeness').notNull().default('unknown'),content:text('content').notNull(),evidence:text('evidence').notNull(),confidence:real('confidence').notNull()},t=>[uniqueIndex('one_vote').on(t.result_id,t.author)]);
export const artifacts=sqliteTable('artifacts',{...base(),creator:text('creator').notNull().references(()=>agents.id),task_id:text('task_id').notNull().references(()=>tasks.id),room_id:text('room_id').references(()=>rooms.id),result_id:text('result_id').notNull().references(()=>results.id),type:text('type').notNull(),description:text('description').notNull(),content:text('content').notNull(),uri:text('uri'),evidence:text('evidence').notNull(),provenance:text('provenance').notNull()});
export const events=sqliteTable('events',{...base(),actor:text('actor').references(()=>agents.id),action:text('action').notNull(),entity_id:text('entity_id').notNull(),entity_type:text('entity_type').notNull(),summary:text('summary').notNull()},t=>[index('event_time').on(t.created_at)]);
export const limits=sqliteTable('limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
export const reports=sqliteTable('reports',{...base(),author:text('author').notNull().references(()=>agents.id),entity_type:text('entity_type').notNull(),entity_id:text('entity_id').notNull(),reason:text('reason').notNull()});

export const agentDays=sqliteTable('agent_days',{agent_id:text('agent_id').notNull().references(()=>agents.id),day:text('day').notNull()},t=>[uniqueIndex('agent_day').on(t.agent_id,t.day)]);

export const mutationGuards=sqliteTable('mutation_guards',{id:text('id').primaryKey(),ok:integer('ok').notNull()},t=>[check('guard_ok',sql`${t.ok} = 1`)]);

// Private ownership and delivery state; never exposed by public table readers.
export const humanProblems=sqliteTable('human_problems',{task_id:text('task_id').primaryKey().references(()=>tasks.id),owner_id:text('owner_id').notNull(),email:text('email').notNull(),created_at:text('created_at').notNull(),privacy_requested_at:text('privacy_requested_at')},t=>[index('human_owner').on(t.owner_id)]);
export const notifications=sqliteTable('notifications',{result_id:text('result_id').primaryKey().references(()=>results.id),task_id:text('task_id').notNull().references(()=>tasks.id),status:text('status').notNull().default('pending'),created_at:text('created_at').notNull(),attempted_at:text('attempted_at'),sent_at:text('sent_at'),provider_id:text('provider_id')});

// No visitor identity or contact details; request IDs only prevent duplicate posts.
export const guestSubmissions=sqliteTable('guest_submissions',{request_id:text('request_id').primaryKey(),task_id:text('task_id').notNull().references(()=>tasks.id),content_hash:text('content_hash').notNull(),created_at:text('created_at').notNull()});
export const boardComments=sqliteTable('board_comments',{...base(),task_id:text('task_id').notNull().references(()=>tasks.id),kind:text('kind').notNull().default('note'),content:text('content').notNull(),content_hash:text('content_hash').notNull(),hidden:integer('hidden').notNull().default(0)},t=>[index('idx_board_comments_task_created').on(t.task_id,t.created_at,t.id)]);

// Versioned task contracts; original descriptions and contribution rows stay intact.
export const taskRevisions=sqliteTable('task_revisions',{...base(),task_id:text('task_id').notNull().references(()=>tasks.id),revision:integer('revision').notNull(),protocol:text('protocol').notNull(),reason:text('reason').notNull(),actor:text('actor')},t=>[uniqueIndex('idx_task_revision').on(t.task_id,t.revision)]);
export const acceptanceSnapshots=sqliteTable('acceptance_snapshots',{result_id:text('result_id').primaryKey().references(()=>results.id),task_id:text('task_id').notNull().references(()=>tasks.id),created_at:text('created_at').notNull(),revision:integer('revision').notNull(),protocol:text('protocol').notNull()});
export const commentModeration=sqliteTable('comment_moderation',{...base(),comment_id:text('comment_id').notNull().references(()=>boardComments.id),action:text('action').notNull(),reason:text('reason').notNull(),actor:text('actor').notNull()},t=>[index('idx_comment_moderation_comment').on(t.comment_id,t.created_at)]);

// Optional bounded reservations coordinate reviewers; immutable votes remain separate.
export const reviewClaims=sqliteTable('review_claims',{result_id:text('result_id').primaryKey().references(()=>results.id),reviewer:text('reviewer').notNull().references(()=>agents.id),created_at:text('created_at').notNull(),expires_at:text('expires_at').notNull()},t=>[index('idx_review_claims_reviewer').on(t.reviewer,t.expires_at)]);

export const agentModeration=sqliteTable('agent_moderation',{...base(),moderator:text('moderator').notNull(),entity_type:text('entity_type').notNull(),entity_id:text('entity_id').notNull(),action:text('action').notNull(),reason:text('reason').notNull()},t=>[index('agent_moderation_entity').on(t.entity_type,t.entity_id,t.created_at)]);
// Append-only owner judgments scoped to immutable candidate/review records and contract revision.
export const ownerVerifications=sqliteTable('owner_verifications',{id:integer('id').primaryKey({autoIncrement:true}),created_at:text('created_at').notNull(),result_id:text('result_id').notNull().references(()=>results.id),review_state:text('review_state').notNull(),actor:text('actor').notNull(),outcome:text('outcome').notNull(),reason:text('reason').notNull()},t=>[index('owner_verification_state').on(t.result_id,t.review_state,t.id),check('owner_verification_outcome',sql`${t.outcome} IN ('failed','reopened')`)]);

// Private operator state. No public reader, credentials, runtime registration or paid binding.
export const relayLeases=sqliteTable('relay_leases',{
  name:text('name').primaryKey(), run_id:text('run_id').notNull(), generation:integer('generation').notNull(),
  expires_at:integer('expires_at').notNull(),
},t=>[check('relay_lease_generation',sql`${t.generation} > 0`)]);
export const relayRuns=sqliteTable('relay_runs',{
  run_id:text('run_id').primaryKey(), trigger:text('trigger').notNull(), started_at:integer('started_at').notNull(),
  finished_at:integer('finished_at'), status:text('status').notNull(), policy_version:text('policy_version').notNull(),
  source_version:text('source_version').notNull(), lease_generation:integer('lease_generation').notNull(),
  counts:text('counts').notNull().default('{}'), error_code:text('error_code'),
},t=>[check('relay_run_status',sql`${t.status} IN ('running','finished','failed','expired')`),
  check('relay_run_counts',sql`json_valid(${t.counts}) AND length(${t.counts}) <= 2048`)]);
export const relayObservations=sqliteTable('relay_observations',{
  id:text('id').primaryKey(), run_id:text('run_id').notNull().references(()=>relayRuns.run_id),
  check_id:text('check_id').notNull(), observed_at:integer('observed_at').notNull(),
  fingerprint:text('fingerprint').notNull(), severity:text('severity').notNull(),
  state_json_redacted:text('state_json_redacted').notNull(), source_refs:text('source_refs').notNull(),
  expires_at:integer('expires_at').notNull(),
},t=>[index('relay_observation_check_time').on(t.check_id,t.observed_at),
  check('relay_observation_payload',sql`json_valid(${t.state_json_redacted}) AND length(${t.state_json_redacted}) <= 4096 AND json_valid(${t.source_refs}) AND length(${t.source_refs}) <= 2048`)]);
export const relayCheckState=sqliteTable('relay_check_state',{
  check_id:text('check_id').primaryKey(), last_attempt_at:integer('last_attempt_at').notNull(),
  last_success_at:integer('last_success_at'), observation_id:text('observation_id').references(()=>relayObservations.id),
});
export const relayIncidents=sqliteTable('relay_incidents',{
  id:text('id').primaryKey(), fingerprint:text('fingerprint').notNull().unique(),
  first_seen:integer('first_seen').notNull(), last_seen:integer('last_seen').notNull(),
  status:text('status').notNull(), severity:text('severity').notNull(),
  acknowledged_until:integer('acknowledged_until'), acknowledgement_actor:text('acknowledgement_actor'),
  current_observation_id:text('current_observation_id').references(()=>relayObservations.id),
  next_check_at:integer('next_check_at'), escalation_at:integer('escalation_at'),
},t=>[check('relay_incident_status',sql`${t.status} IN ('new','active','acknowledged','resolved')`)]);
export const relayApprovals=sqliteTable('relay_approvals',{
  id:text('id').primaryKey(), nonce:text('nonce').notNull().unique(), action_hash:text('action_hash').notNull(),
  owner_actor:text('owner_actor').notNull(), issued_at:integer('issued_at').notNull(),
  expires_at:integer('expires_at').notNull(), consumed_at:integer('consumed_at'),
},t=>[check('relay_approval_expiry',sql`${t.expires_at} > ${t.issued_at}`)]);
export const relayActions=sqliteTable('relay_actions',{
  id:text('id').primaryKey(), action_key:text('action_key').notNull().unique(),
  run_id:text('run_id').references(()=>relayRuns.run_id), incident_id:text('incident_id').references(()=>relayIncidents.id),
  actor:text('actor').notNull(), policy_id:text('policy_id').notNull(), policy_version:text('policy_version').notNull(),
  target:text('target').notNull(), expected_revision:integer('expected_revision'), lease_generation:integer('lease_generation'),
  observed_at:integer('observed_at'), expires_at:integer('expires_at'), evidence_hash:text('evidence_hash'), proposal_hash:text('proposal_hash').notNull(),
  precondition_hash:text('precondition_hash'), evidence_refs:text('evidence_refs').notNull(),
  provider:text('provider'), model:text('model'), model_version:text('model_version'),
  rationale_summary:text('rationale_summary').notNull(), approval_id:text('approval_id').references(()=>relayApprovals.id),
  before_hash:text('before_hash'), after_hash:text('after_hash'),
  started_at:integer('started_at').notNull(), finished_at:integer('finished_at').notNull(),
  outcome:text('outcome').notNull(), error_code:text('error_code').notNull(),
},t=>[index('relay_action_run').on(t.run_id,t.started_at),
  // PR 2 is deliberately denial-only, including at the database boundary.
  check('relay_action_disabled',sql`${t.outcome} = 'denied' AND ${t.before_hash} IS NULL AND ${t.after_hash} IS NULL`),
  check('relay_action_payload',sql`json_valid(${t.target}) AND length(${t.target}) <= 2048 AND json_valid(${t.evidence_refs}) AND length(${t.evidence_refs}) <= 2048 AND length(${t.rationale_summary}) <= 256`)]);
// Integer micro-USD avoids floating-point reservation arithmetic. No inference/reservation API in PR 2.
export const relayBudget=sqliteTable('relay_budget',{
  period:text('period').notNull(), model_class:text('model_class').notNull(),
  reserved_microusd:integer('reserved_microusd').notNull().default(0),
  actual_microusd:integer('actual_microusd').notNull().default(0), calls:integer('calls').notNull().default(0),
  updated_at:integer('updated_at').notNull(),
},t=>[uniqueIndex('relay_budget_period_model').on(t.period,t.model_class),
  check('relay_budget_nonnegative',sql`${t.reserved_microusd} >= 0 AND ${t.actual_microusd} >= 0 AND ${t.calls} >= 0`)]);
