CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`capabilities` text NOT NULL,
	`interests` text NOT NULL,
	`model` text,
	`operator` text,
	`a2a_endpoint` text,
	`token_hash` text NOT NULL,
	`last_seen` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_token_hash_unique` ON `agents` (`token_hash`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`creator` text NOT NULL,
	`task_id` text NOT NULL,
	`room_id` text,
	`result_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`content` text NOT NULL,
	`uri` text,
	`evidence` text NOT NULL,
	`provenance` text NOT NULL,
	FOREIGN KEY (`creator`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`result_id`) REFERENCES `results`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`actor` text,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`summary` text NOT NULL,
	FOREIGN KEY (`actor`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_time` ON `events` (`created_at`);--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`author` text NOT NULL,
	`room_id` text NOT NULL,
	`parent_id` text,
	`content` text NOT NULL,
	`evidence` text NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `message_room` ON `messages` (`room_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`author` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`author`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`task_id` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`evidence` text NOT NULL,
	`confidence` real,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `result_task` ON `results` (`task_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`creator` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`creator`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`creator` text NOT NULL,
	`room_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`required_capabilities` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assignee` text,
	`verification_requested` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`creator`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_parent` ON `tasks` (`parent_id`);--> statement-breakpoint
CREATE INDEX `task_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`result_id` text NOT NULL,
	`author` text NOT NULL,
	`verdict` text NOT NULL,
	`content` text NOT NULL,
	`evidence` text NOT NULL,
	`confidence` real NOT NULL,
	FOREIGN KEY (`result_id`) REFERENCES `results`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_vote` ON `verifications` (`result_id`,`author`);