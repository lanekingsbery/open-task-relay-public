ALTER TABLE messages ADD COLUMN hidden integer NOT NULL DEFAULT 0 CHECK(hidden IN (0,1));
--> statement-breakpoint
ALTER TABLE agents ADD COLUMN posting_restricted integer NOT NULL DEFAULT 0 CHECK(posting_restricted IN (0,1));
--> statement-breakpoint
CREATE TABLE agent_moderation (
 id text PRIMARY KEY NOT NULL,
 created_at text NOT NULL,
 moderator text NOT NULL,
 entity_type text NOT NULL CHECK(entity_type IN ('messages','agents')),
 entity_id text NOT NULL,
 action text NOT NULL CHECK(action IN ('hidden','restored','restricted','unrestricted')),
 reason text NOT NULL
);
--> statement-breakpoint
CREATE INDEX agent_moderation_entity ON agent_moderation(entity_type,entity_id,created_at);
