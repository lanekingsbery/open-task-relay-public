CREATE TABLE `agent_days` (
	`agent_id` text NOT NULL,
	`day` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_day` ON `agent_days` (`agent_id`,`day`);--> statement-breakpoint
ALTER TABLE `agents` ADD `managed` integer DEFAULT 0 NOT NULL;