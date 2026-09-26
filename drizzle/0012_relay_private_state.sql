CREATE TABLE `relay_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`action_key` text NOT NULL,
	`run_id` text,
	`incident_id` text,
	`actor` text NOT NULL,
	`policy_id` text NOT NULL,
	`policy_version` text NOT NULL,
	`target` text NOT NULL,
	`expected_revision` integer,
	`lease_generation` integer,
	`observed_at` integer,
	`expires_at` integer,
	`evidence_hash` text,
	`proposal_hash` text NOT NULL,
	`precondition_hash` text,
	`evidence_refs` text NOT NULL,
	`provider` text,
	`model` text,
	`model_version` text,
	`rationale_summary` text NOT NULL,
	`approval_id` text,
	`before_hash` text,
	`after_hash` text,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`error_code` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `relay_runs`(`run_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `relay_incidents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `relay_approvals`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "relay_action_disabled" CHECK("relay_actions"."outcome" = 'denied' AND "relay_actions"."before_hash" IS NULL AND "relay_actions"."after_hash" IS NULL),
	CONSTRAINT "relay_action_payload" CHECK(json_valid("relay_actions"."target") AND length("relay_actions"."target") <= 2048 AND json_valid("relay_actions"."evidence_refs") AND length("relay_actions"."evidence_refs") <= 2048 AND length("relay_actions"."rationale_summary") <= 256)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_actions_action_key_unique` ON `relay_actions` (`action_key`);--> statement-breakpoint
CREATE INDEX `relay_action_run` ON `relay_actions` (`run_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `relay_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`action_hash` text NOT NULL,
	`owner_actor` text NOT NULL,
	`issued_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	CONSTRAINT "relay_approval_expiry" CHECK("relay_approvals"."expires_at" > "relay_approvals"."issued_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_approvals_nonce_unique` ON `relay_approvals` (`nonce`);--> statement-breakpoint
CREATE TABLE `relay_budget` (
	`period` text NOT NULL,
	`model_class` text NOT NULL,
	`reserved_microusd` integer DEFAULT 0 NOT NULL,
	`actual_microusd` integer DEFAULT 0 NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "relay_budget_nonnegative" CHECK("relay_budget"."reserved_microusd" >= 0 AND "relay_budget"."actual_microusd" >= 0 AND "relay_budget"."calls" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_budget_period_model` ON `relay_budget` (`period`,`model_class`);--> statement-breakpoint
CREATE TABLE `relay_check_state` (
	`check_id` text PRIMARY KEY NOT NULL,
	`last_attempt_at` integer NOT NULL,
	`last_success_at` integer,
	`observation_id` text,
	FOREIGN KEY (`observation_id`) REFERENCES `relay_observations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `relay_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`status` text NOT NULL,
	`severity` text NOT NULL,
	`acknowledged_until` integer,
	`acknowledgement_actor` text,
	`current_observation_id` text,
	`next_check_at` integer,
	`escalation_at` integer,
	FOREIGN KEY (`current_observation_id`) REFERENCES `relay_observations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "relay_incident_status" CHECK("relay_incidents"."status" IN ('new','active','acknowledged','resolved'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_incidents_fingerprint_unique` ON `relay_incidents` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `relay_leases` (
	`name` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`generation` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT "relay_lease_generation" CHECK("relay_leases"."generation" > 0)
);
--> statement-breakpoint
CREATE TABLE `relay_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`check_id` text NOT NULL,
	`observed_at` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`severity` text NOT NULL,
	`state_json_redacted` text NOT NULL,
	`source_refs` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `relay_runs`(`run_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "relay_observation_payload" CHECK(json_valid("relay_observations"."state_json_redacted") AND length("relay_observations"."state_json_redacted") <= 4096 AND json_valid("relay_observations"."source_refs") AND length("relay_observations"."source_refs") <= 2048)
);
--> statement-breakpoint
CREATE INDEX `relay_observation_check_time` ON `relay_observations` (`check_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `relay_runs` (
	`run_id` text PRIMARY KEY NOT NULL,
	`trigger` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`policy_version` text NOT NULL,
	`source_version` text NOT NULL,
	`lease_generation` integer NOT NULL,
	`counts` text DEFAULT '{}' NOT NULL,
	`error_code` text,
	CONSTRAINT "relay_run_status" CHECK("relay_runs"."status" IN ('running','finished','failed','expired')),
	CONSTRAINT "relay_run_counts" CHECK(json_valid("relay_runs"."counts") AND length("relay_runs"."counts") <= 2048)
);
--> statement-breakpoint
-- Audit rows are immutable; corrections must be new events. Retention is owner-operated.
CREATE TRIGGER relay_actions_no_update BEFORE UPDATE ON relay_actions
BEGIN SELECT RAISE(ABORT, 'relay audit is append only'); END;
--> statement-breakpoint
CREATE TRIGGER relay_actions_no_delete BEFORE DELETE ON relay_actions
BEGIN SELECT RAISE(ABORT, 'relay audit is append only'); END;
