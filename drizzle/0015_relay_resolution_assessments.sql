CREATE TABLE `relay_resolution_assessments` (
	`result_id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`wake_slot` integer NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`assessment_json` text,
	`error_code` text,
	FOREIGN KEY (`result_id`) REFERENCES `results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "relay_resolution_status_check" CHECK("relay_resolution_assessments"."status" IN ('running','deferred','complete','failed')),
	CONSTRAINT "relay_resolution_payload" CHECK("relay_resolution_assessments"."assessment_json" IS NULL OR (json_valid("relay_resolution_assessments"."assessment_json") AND length("relay_resolution_assessments"."assessment_json")<=4096))
);
--> statement-breakpoint
CREATE INDEX `relay_resolution_status` ON `relay_resolution_assessments` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `relay_resolution_wake_slot` ON `relay_resolution_assessments` (`wake_slot`);