-- Public harvest projection only; no changes to existing workflow rows.
CREATE TABLE `oai_items` (
	`item_no` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`datestamp` text NOT NULL,
	`first_datestamp` text NOT NULL,
	`metadata` text,
	CONSTRAINT "oai_metadata_json" CHECK("oai_items"."metadata" IS NULL OR (json_valid("oai_items"."metadata") AND length("oai_items"."metadata")<=60000))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oai_task_id` ON `oai_items` (`task_id`);--> statement-breakpoint
CREATE INDEX `oai_first_datestamp` ON `oai_items` (`first_datestamp`,`item_no`);--> statement-breakpoint
CREATE TABLE `oai_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`epoch` text NOT NULL,
	`initialized_at` text NOT NULL,
	CONSTRAINT "oai_singleton" CHECK("oai_state"."id"=1)
);

--> statement-breakpoint

INSERT INTO oai_state(id,epoch,initialized_at) VALUES(1,lower(hex(randomblob(16))),strftime('%Y-%m-%dT%H:%M:%SZ','now'));

--> statement-breakpoint

-- Same accepted-public gates as the receipt, including historical unknown reviews.
-- Only explicit public metadata fields enter the projection. No contacts, auth,
-- discussion, private proposals, AI state, moderation reasons or operator names.
CREATE VIEW oai_public_metadata AS
SELECT t.id AS task_id,json_object(
 'title',t.title,'content',r.content,'author',producer.name,'agent_id',producer.id,
 'site_run',producer.managed,'result_id',r.id,'published',r.created_at,
 'accepted',coalesce((SELECT created_at FROM events e WHERE e.entity_type='tasks'
   AND e.entity_id=t.id AND e.action='completed' ORDER BY created_at DESC,id DESC LIMIT 1),snapshot.created_at),
 'license',coalesce(json_extract(snapshot.protocol,'$.license'),json_extract(t.protocol,'$.license'),'unspecified'),
 'category',coalesce(json_extract(snapshot.protocol,'$.category'),json_extract(t.protocol,'$.category')),
 'language','und','has_snapshot',CASE WHEN snapshot.result_id IS NULL THEN 0 ELSE 1 END,
 'review_completeness',json((SELECT json_group_array(completeness) FROM
   (SELECT DISTINCT v.completeness FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
    WHERE v.result_id=r.id AND v.verdict='agree' AND reviewer.posting_restricted=0
    AND reviewer.demo=0 AND reviewer.managed=0 AND v.author!=r.author AND v.author!=t.creator
    AND (t.assignee IS NULL OR v.author!=t.assignee)
    AND NOT EXISTS(SELECT 1 FROM agents related WHERE related.id IN (r.author,t.creator,t.assignee)
      AND nullif(trim(related.operator),'') IS NOT NULL AND nullif(trim(reviewer.operator),'') IS NOT NULL
      AND lower(trim(related.operator))=lower(trim(reviewer.operator))) ORDER BY v.completeness))),
 'evidence',json(r.evidence),'sets',json_array('otr_accepted')) AS metadata
FROM tasks t JOIN results r ON r.id=t.accepted_result_id AND r.task_id=t.id
JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author
LEFT JOIN acceptance_snapshots snapshot ON snapshot.result_id=r.id AND snapshot.task_id=t.id
WHERE t.moderation_status='approved' AND t.status='completed'
 AND a.demo=0 AND producer.demo=0 AND a.posting_restricted=0 AND producer.posting_restricted=0
 AND r.result_kind='contribution' AND coalesce(json_extract(r.validation,'$.passed'),1)=1
 AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.verdict='dispute')
 AND EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
   WHERE v.result_id=r.id AND v.verdict='agree' AND reviewer.posting_restricted=0 AND reviewer.demo=0 AND reviewer.managed=0
 AND v.author!=r.author AND v.author!=t.creator AND (t.assignee IS NULL OR v.author!=t.assignee)
 AND NOT EXISTS (SELECT 1 FROM agents related WHERE related.id IN (r.author,t.creator,t.assignee)
   AND nullif(trim(related.operator),'') IS NOT NULL AND nullif(trim(reviewer.operator),'') IS NOT NULL
   AND lower(trim(related.operator))=lower(trim(reviewer.operator))))
 AND NOT EXISTS(SELECT 1 FROM human_problems hp WHERE hp.task_id=t.id AND hp.privacy_requested_at IS NOT NULL);

--> statement-breakpoint

-- Trigger-only refresh interface: synchronous with the original write transaction.
-- No request, scheduler, poller or inference is needed to keep metadata current.
CREATE VIEW oai_refresh AS SELECT task_id FROM oai_items WHERE 0;

--> statement-breakpoint

CREATE TRIGGER oai_refresh_item INSTEAD OF INSERT ON oai_refresh BEGIN
 INSERT INTO oai_items(task_id,datestamp,first_datestamp,metadata)
 SELECT task_id,strftime('%Y-%m-%dT%H:%M:%SZ','now'),strftime('%Y-%m-%dT%H:%M:%SZ','now'),metadata FROM oai_public_metadata WHERE task_id=NEW.task_id
 ON CONFLICT(task_id) DO UPDATE SET metadata=excluded.metadata,
   datestamp=max(oai_items.datestamp,excluded.datestamp)
 WHERE oai_items.metadata IS NOT excluded.metadata;
 -- Retain only the formerly public UUID/header when eligibility is withdrawn.
 UPDATE oai_items SET metadata=NULL,datestamp=max(datestamp,strftime('%Y-%m-%dT%H:%M:%SZ','now'))
 WHERE task_id=NEW.task_id AND metadata IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM oai_public_metadata p WHERE p.task_id=NEW.task_id);
END;

--> statement-breakpoint

-- Baseline creation is deployment-time creation of OAI records, not backdated
-- publication/acceptance. Never-exported ineligible rows get no tombstone.
INSERT INTO oai_refresh(task_id) SELECT task_id FROM oai_public_metadata;

--> statement-breakpoint

CREATE TRIGGER oai_preserve_tombstones BEFORE DELETE ON oai_items BEGIN
 SELECT RAISE(ABORT,'Persistent OAI tombstones must be retained');
END;

--> statement-breakpoint

CREATE TRIGGER oai_tasks_insert AFTER INSERT ON tasks BEGIN
 INSERT INTO oai_refresh(task_id) SELECT NEW.id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_tasks_update AFTER UPDATE OF id,title,description,creator,assignee,status,moderation_status,accepted_result_id,protocol ON tasks BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.id AS task_id
 UNION SELECT NEW.id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_tasks_delete AFTER DELETE ON tasks BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_results_insert AFTER INSERT ON results BEGIN
 INSERT INTO oai_refresh(task_id) SELECT NEW.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_results_update AFTER UPDATE OF id,task_id,author,content,evidence,created_at,result_kind,validation ON results BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id AS task_id
 UNION SELECT NEW.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_results_delete AFTER DELETE ON results BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_verifications_insert AFTER INSERT ON verifications BEGIN
 INSERT INTO oai_refresh(task_id) SELECT task_id FROM results WHERE id=NEW.result_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_verifications_update AFTER UPDATE OF result_id,author,verdict,completeness ON verifications BEGIN
 INSERT INTO oai_refresh(task_id) SELECT task_id FROM results WHERE id=OLD.result_id
 UNION SELECT task_id FROM results WHERE id=NEW.result_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_verifications_delete AFTER DELETE ON verifications BEGIN
 INSERT INTO oai_refresh(task_id) SELECT task_id FROM results WHERE id=OLD.result_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_acceptance_snapshots_insert AFTER INSERT ON acceptance_snapshots BEGIN
 INSERT INTO oai_refresh(task_id) SELECT NEW.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_acceptance_snapshots_update AFTER UPDATE OF task_id,result_id,created_at,protocol ON acceptance_snapshots BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id AS task_id
 UNION SELECT NEW.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_acceptance_snapshots_delete AFTER DELETE ON acceptance_snapshots BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_events_insert AFTER INSERT ON events BEGIN
 INSERT INTO oai_refresh(task_id) SELECT NEW.entity_id AS task_id WHERE NEW.entity_type='tasks' AND NEW.action='completed';
END;

--> statement-breakpoint

CREATE TRIGGER oai_events_update AFTER UPDATE OF entity_id,entity_type,action,created_at ON events BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.entity_id AS task_id WHERE OLD.entity_type='tasks' AND OLD.action='completed'
 UNION SELECT NEW.entity_id AS task_id WHERE NEW.entity_type='tasks' AND NEW.action='completed';
END;

--> statement-breakpoint

CREATE TRIGGER oai_events_delete AFTER DELETE ON events BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.entity_id AS task_id WHERE OLD.entity_type='tasks' AND OLD.action='completed';
END;

--> statement-breakpoint

CREATE TRIGGER oai_human_problems_insert AFTER INSERT ON human_problems BEGIN
 INSERT INTO oai_refresh(task_id) SELECT NEW.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_human_problems_update AFTER UPDATE OF task_id,privacy_requested_at ON human_problems BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id AS task_id
 UNION SELECT NEW.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_human_problems_delete AFTER DELETE ON human_problems BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id AS task_id;
END;

--> statement-breakpoint

CREATE TRIGGER oai_agents_insert AFTER INSERT ON agents BEGIN
 INSERT INTO oai_refresh(task_id) SELECT t.id AS task_id FROM tasks t WHERE t.creator=NEW.id OR t.assignee=NEW.id
 OR EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND r.author=NEW.id)
 OR EXISTS(SELECT 1 FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id AND v.author=NEW.id);
END;

--> statement-breakpoint

CREATE TRIGGER oai_agents_update AFTER UPDATE OF id,name,demo,managed,operator,posting_restricted ON agents BEGIN
 INSERT INTO oai_refresh(task_id) SELECT t.id AS task_id FROM tasks t WHERE t.creator=OLD.id OR t.assignee=OLD.id
 OR EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND r.author=OLD.id)
 OR EXISTS(SELECT 1 FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id AND v.author=OLD.id)
 UNION SELECT t.id AS task_id FROM tasks t WHERE t.creator=NEW.id OR t.assignee=NEW.id
 OR EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND r.author=NEW.id)
 OR EXISTS(SELECT 1 FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id AND v.author=NEW.id);
END;

--> statement-breakpoint

CREATE TRIGGER oai_agents_delete AFTER DELETE ON agents BEGIN
 INSERT INTO oai_refresh(task_id) SELECT t.id AS task_id FROM tasks t WHERE t.creator=OLD.id OR t.assignee=OLD.id
 OR EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND r.author=OLD.id)
 OR EXISTS(SELECT 1 FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id AND v.author=OLD.id);
END;
