CREATE TABLE relay_finishing (
 state_key TEXT PRIMARY KEY NOT NULL,
 task_id TEXT NOT NULL REFERENCES tasks(id),
 created_at INTEGER NOT NULL,
 wake_slot INTEGER UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('running','deferred','prepared','complete','failed')),
 source_version TEXT NOT NULL,
 source_result_ids TEXT NOT NULL CHECK(json_valid(source_result_ids)),
 decision_json TEXT CHECK(decision_json IS NULL OR (json_valid(decision_json) AND length(decision_json)<=24000)),
 candidate_id TEXT REFERENCES results(id),
 error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3)
);
--> statement-breakpoint
CREATE INDEX relay_finishing_task ON relay_finishing(task_id,created_at);
--> statement-breakpoint
CREATE TABLE owner_completion_checks (
 result_id TEXT PRIMARY KEY NOT NULL REFERENCES results(id),
 task_id TEXT NOT NULL REFERENCES tasks(id),
 created_at TEXT NOT NULL,
 revision INTEGER NOT NULL,
 actor TEXT NOT NULL,
 review_ids TEXT NOT NULL CHECK(json_valid(review_ids)),
 reason TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE task_handoffs (
 id TEXT PRIMARY KEY NOT NULL,
 task_id TEXT NOT NULL REFERENCES tasks(id),
 created_at TEXT NOT NULL,
 actor TEXT,
 before_protocol TEXT NOT NULL CHECK(json_valid(before_protocol)),
 after_protocol TEXT NOT NULL CHECK(json_valid(after_protocol)),
 reason TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX task_handoffs_task ON task_handoffs(task_id,created_at);

--> statement-breakpoint
CREATE TABLE task_conclusions (
 result_id TEXT PRIMARY KEY NOT NULL REFERENCES results(id),
 conclusion TEXT NOT NULL CHECK(length(conclusion) BETWEEN 20 AND 420),
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL
);

--> statement-breakpoint
CREATE TABLE relay_billing_limits (
 id INTEGER PRIMARY KEY NOT NULL CHECK(id=1),
 day_microusd INTEGER NOT NULL CHECK(day_microusd>0),
 month_microusd INTEGER NOT NULL CHECK(month_microusd>0)
);
