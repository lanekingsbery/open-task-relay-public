CREATE TABLE `relay_operator_control` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`revision` integer NOT NULL,
	CONSTRAINT "operator_singleton" CHECK("relay_operator_control"."id"=1),
	CONSTRAINT "operator_enabled" CHECK("relay_operator_control"."enabled" IN (0,1)),
	CONSTRAINT "operator_revision" CHECK("relay_operator_control"."revision">0)
);
--> statement-breakpoint
CREATE TABLE `relay_operator_followups` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`incident_id` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `relay_incidents`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "operator_followup_status" CHECK("relay_operator_followups"."status" IN ('open','resolved'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_operator_followups_fingerprint_unique` ON `relay_operator_followups` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `relay_operator_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`action_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`run_id` text,
	`actor` text NOT NULL,
	`policy_rule` text NOT NULL,
	`policy_version` text NOT NULL,
	`reason` text NOT NULL,
	`source_version` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`autonomous` integer NOT NULL,
	`before_json` text NOT NULL,
	`after_json` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `relay_runs`(`run_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "operator_policy" CHECK("relay_operator_receipts"."policy_version"='operator-v1'),
	CONSTRAINT "operator_reason" CHECK(length("relay_operator_receipts"."reason")<=256),
	CONSTRAINT "operator_source" CHECK(length("relay_operator_receipts"."source_version")=40),
	CONSTRAINT "operator_autonomous" CHECK("relay_operator_receipts"."autonomous" IN (0,1)),
	CONSTRAINT "operator_before" CHECK(json_valid("relay_operator_receipts"."before_json") AND length("relay_operator_receipts"."before_json")<=24000),
	CONSTRAINT "operator_after" CHECK(json_valid("relay_operator_receipts"."after_json") AND length("relay_operator_receipts"."after_json")<=24000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_operator_receipts_action_key_unique` ON `relay_operator_receipts` (`action_key`);--> statement-breakpoint
CREATE INDEX `relay_operator_daily` ON `relay_operator_receipts` (`autonomous`,`created_at`);--> statement-breakpoint
CREATE TABLE `relay_task_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`payload_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`input_json` text NOT NULL,
	`draft_json` text,
	`draft_hash` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`task_id` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "request_status" CHECK("relay_task_requests"."status" IN ('HOLD','DENY','DRAFT','PUBLISHED')),
	CONSTRAINT "request_input" CHECK(json_valid("relay_task_requests"."input_json") AND length("relay_task_requests"."input_json")<=16384),
	CONSTRAINT "request_draft" CHECK("relay_task_requests"."draft_json" IS NULL OR (json_valid("relay_task_requests"."draft_json") AND length("relay_task_requests"."draft_json")<=24000)),
	CONSTRAINT "request_revision" CHECK("relay_task_requests"."revision">0),
	CONSTRAINT "request_publication" CHECK(("relay_task_requests"."status"='PUBLISHED')=("relay_task_requests"."task_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_task_requests_key_hash_unique` ON `relay_task_requests` (`key_hash`);--> statement-breakpoint
CREATE INDEX `relay_operator_requests_queue` ON `relay_task_requests` (`status`,`created_at`);
--> statement-breakpoint
-- Effective only with the separately enabled private Worker binding; public forks are inert.
INSERT INTO relay_operator_control(id,enabled,revision) VALUES (1,1,1);
--> statement-breakpoint
CREATE TRIGGER relay_operator_no_update BEFORE UPDATE ON relay_operator_receipts
BEGIN SELECT RAISE(ABORT,'operator audit is append only'); END;
--> statement-breakpoint
CREATE TRIGGER relay_operator_no_delete BEFORE DELETE ON relay_operator_receipts
BEGIN SELECT RAISE(ABORT,'operator audit is append only'); END;
