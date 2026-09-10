CREATE TABLE `review_claims` (
	`result_id` text PRIMARY KEY NOT NULL,
	`reviewer` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`result_id`) REFERENCES `results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_review_claims_reviewer` ON `review_claims` (`reviewer`,`expires_at`);--> statement-breakpoint
ALTER TABLE `agents` ADD `recovery_hash` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `credential_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `credential_created_at` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `credential_revoked_at` text;--> statement-breakpoint
ALTER TABLE `results` ADD `result_kind` text DEFAULT 'contribution' NOT NULL;--> statement-breakpoint
ALTER TABLE `results` ADD `premise` text;