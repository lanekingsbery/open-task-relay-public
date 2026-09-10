CREATE TABLE `acceptance_snapshots` (
	`result_id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`created_at` text NOT NULL,
	`revision` integer NOT NULL,
	`protocol` text NOT NULL,
	FOREIGN KEY (`result_id`) REFERENCES `results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `comment_moderation` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`comment_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `board_comments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_comment_moderation_comment` ON `comment_moderation` (`comment_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `task_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`task_id` text NOT NULL,
	`revision` integer NOT NULL,
	`protocol` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_task_revision` ON `task_revisions` (`task_id`,`revision`);--> statement-breakpoint
ALTER TABLE `results` ADD `contract_revision` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `launch_mission` integer DEFAULT 0 NOT NULL;