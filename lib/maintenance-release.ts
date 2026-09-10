import {type DB} from './commons.ts';
// Fixed owner-authorized editorial decisions, 2026-09-09. Not a public admin API.
// Exact IDs, observed versions, result counts and one-time markers preserve new work.
import {maintenanceDecisions,productionCheckAgents,maintenanceMerges} from './operational-decisions.ts';
export {maintenanceDecisions} from './operational-decisions.ts';
export async function applyMaintenanceRelease(db:DB,decisions=maintenanceDecisions){
 if(await db.prepare("SELECT id FROM events WHERE id='maintenance-2026-09-09:complete'").first())return;
 const stamp=new Date().toISOString();
 for(const d of decisions){
  const marker='maintenance-2026-09-09:'+d.task_id;
  await db.batch([
   db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
    SELECT ?,?,NULL,'maintenance quarantine','tasks',id,? FROM tasks
    WHERE id=? AND title=? AND updated_at=? AND moderation_status='approved'
    AND (SELECT count(*) FROM results WHERE task_id=tasks.id)=?
    ON CONFLICT(id) DO NOTHING`).bind(marker,stamp,d.reason,d.task_id,d.title,d.updated_at,d.result_count),
   db.prepare(`UPDATE tasks SET moderation_status='quarantined',
    status=CASE WHEN accepted_result_id IS NULL THEN 'closed' ELSE status END,
    launch_mission=0,claim_expires_at=NULL,updated_at=?
    WHERE id=? AND updated_at=? AND moderation_status='approved'
    AND EXISTS(SELECT 1 FROM events WHERE id=? AND created_at=?)`).bind(stamp,d.task_id,d.updated_at,marker,stamp)
  ]);
 }
 // Correct known operator test identities; never classify external agents by name alone.
 for(const a of productionCheckAgents){
  const marker='maintenance-agent-2026-09-09:'+a.id;
  await db.batch([
   db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
    SELECT ?,?,NULL,'provenance corrected','agents',id,'Operator-authorized production check; classify as site-run, not an outside participant.'
    FROM agents WHERE id=? AND name=? AND managed=0 AND demo=0
    AND EXISTS(SELECT 1 FROM results WHERE id=? AND author=agents.id AND content LIKE 'Operator-authorized production client check%')
    ON CONFLICT(id) DO NOTHING`).bind(marker,stamp,a.id,a.name,a.result_id),
   db.prepare(`UPDATE agents SET managed=1 WHERE id=? AND managed=0
    AND EXISTS(SELECT 1 FROM events WHERE id=? AND created_at=?)`).bind(a.id,marker,stamp)
  ]);
 }
 for(const [from,to,summary] of maintenanceMerges)await db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
  SELECT ?,?,NULL,'duplicate context consolidated','tasks',?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=?)
  ON CONFLICT(id) DO NOTHING`).bind('maintenance-merge:'+from,stamp,to,summary,'maintenance-2026-09-09:'+from).run();
 await db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) VALUES('maintenance-2026-09-09:complete',?,NULL,'maintenance completed','system','weekly-maintenance','Fixed editorial decisions processed; changed tasks were skipped and history preserved.') ON CONFLICT(id) DO NOTHING").bind(stamp).run();
}
