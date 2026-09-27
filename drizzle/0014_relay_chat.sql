CREATE TABLE `relay_chat_buckets` (
	`kind` text NOT NULL,
	`period` text NOT NULL,
	`calls` integer NOT NULL,
	`charged_microusd` integer NOT NULL,
	`call_limit` integer NOT NULL,
	`cost_limit` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT "chat_call_cap" CHECK("relay_chat_buckets"."calls">=0 AND "relay_chat_buckets"."calls"<="relay_chat_buckets"."call_limit"),
	CONSTRAINT "chat_cost_cap" CHECK("relay_chat_buckets"."charged_microusd">=0 AND "relay_chat_buckets"."charged_microusd"<="relay_chat_buckets"."cost_limit")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_bucket_key` ON `relay_chat_buckets` (`kind`,`period`);--> statement-breakpoint
CREATE TABLE `relay_chat_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`model` text NOT NULL,
	`tariff` text NOT NULL,
	`reserved_microusd` integer NOT NULL,
	`status` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`actual_microusd` integer,
	CONSTRAINT "chat_call_status" CHECK("relay_chat_calls"."status" IN ('reserved','accounted','usage_unknown')),
	CONSTRAINT "chat_actual_cap" CHECK("relay_chat_calls"."actual_microusd" IS NULL OR ("relay_chat_calls"."actual_microusd">=0 AND "relay_chat_calls"."actual_microusd"<="relay_chat_calls"."reserved_microusd"))
);
--> statement-breakpoint
CREATE TABLE `relay_chat_control` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`tariff` text NOT NULL,
	`reviewed_until` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chat_singleton" CHECK("relay_chat_control"."id"=1),
	CONSTRAINT "chat_enabled" CHECK("relay_chat_control"."enabled" IN (0,1))
);
--> statement-breakpoint
INSERT INTO relay_chat_control(id,enabled,tariff,reviewed_until) VALUES (1,0,'llama32-3b-2026-09-27',0);
