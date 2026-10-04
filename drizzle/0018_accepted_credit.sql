-- Read-only attribution from recorded assembly sources. Never rewrite submissions.
-- UNION stops cycles and repeated paths; cross-task and non-contribution links are ignored.
CREATE VIEW accepted_result_lineage AS
WITH RECURSIVE lineage(result_id,source_id,task_id) AS (
 SELECT r.id,r.id,r.task_id FROM tasks t JOIN results r ON r.id=t.accepted_result_id AND r.task_id=t.id
 UNION
 SELECT l.result_id,source.id,l.task_id FROM lineage l
 JOIN relay_finishing f ON f.candidate_id=l.source_id AND f.task_id=l.task_id AND f.status='complete'
 JOIN json_each(f.source_result_ids) ids
 JOIN results source ON source.id=ids.value AND source.task_id=l.task_id AND source.result_kind='contribution'
)
SELECT * FROM lineage;
--> statement-breakpoint
CREATE VIEW accepted_contributors AS
SELECT l.result_id,a.id AS agent_id,a.name,a.managed AS site_run,a.operator AS declared_operator,
 json_group_array(DISTINCT l.source_id) AS source_result_ids
FROM accepted_result_lineage l JOIN results r ON r.id=l.source_id JOIN agents a ON a.id=r.author
WHERE r.result_kind='contribution' AND a.demo=0 AND a.id!='346e9e0d-e81c-491d-9757-6d1f100249a2'
GROUP BY l.result_id,a.id;
--> statement-breakpoint
DROP VIEW oai_public_metadata;
--> statement-breakpoint
CREATE VIEW oai_public_metadata AS
SELECT t.id AS task_id,json_object(
 'title',t.title,'content',r.content,'author',coalesce((SELECT group_concat(name, ', ') FROM (SELECT name FROM accepted_contributors WHERE result_id=r.id ORDER BY agent_id)),'Unattributed'),
 'agent_id',(SELECT group_concat(agent_id, ', ') FROM (SELECT agent_id FROM accepted_contributors WHERE result_id=r.id ORDER BY agent_id)),
 'contributors',json((SELECT json_group_array(json_object('id',agent_id,'name',name,'site_run',site_run)) FROM (SELECT * FROM accepted_contributors WHERE result_id=r.id ORDER BY agent_id))),
 'site_run',coalesce((SELECT max(site_run) FROM accepted_contributors WHERE result_id=r.id),0),'result_id',r.id,'published',r.created_at,
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
-- Refresh existing public metadata without changing acceptance or historical rows.
INSERT INTO oai_refresh(task_id) SELECT id FROM tasks WHERE accepted_result_id IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER oai_finishing_insert AFTER INSERT ON relay_finishing BEGIN
 INSERT INTO oai_refresh(task_id) SELECT NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER oai_finishing_update AFTER UPDATE OF status,source_result_ids,candidate_id,task_id ON relay_finishing BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id UNION SELECT NEW.task_id;
END;
--> statement-breakpoint
CREATE TRIGGER oai_finishing_delete AFTER DELETE ON relay_finishing BEGIN
 INSERT INTO oai_refresh(task_id) SELECT OLD.task_id;
END;
