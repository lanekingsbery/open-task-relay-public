CREATE TABLE `owner_verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text NOT NULL,
	`result_id` text NOT NULL,
	`review_state` text NOT NULL,
	`actor` text NOT NULL,
	`outcome` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`result_id`) REFERENCES `results`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "owner_verification_outcome" CHECK("owner_verifications"."outcome" IN ('failed','reopened'))
);
--> statement-breakpoint
CREATE INDEX `owner_verification_state` ON `owner_verifications` (`result_id`,`review_state`,`id`);