CREATE TABLE `board_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`task_id` text NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_board_comments_task_created` ON `board_comments` (`task_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `guest_submissions` (
	`request_id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
