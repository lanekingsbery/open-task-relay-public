import {addCommunityFeature} from './community-feature.ts';
import {type DB} from './commons.ts';
// Owner-requested stricter editorial pass. Exact observed versions preserve new work.
import {strictMaintenanceDecisions} from './operational-decisions.ts';
export {strictMaintenanceDecisions} from './operational-decisions.ts';
export async function applyStrictMaintenanceRelease(db:DB,decisions=strictMaintenanceDecisions){
 const prefix='maintenance-strict-2026-09-09:';
 if(await db.prepare('SELECT id FROM events WHERE id=?').bind(prefix+'complete').first())return;
 const stamp=new Date().toISOString();
 for(const d of decisions){
  const marker=prefix+d.task_id;
  await db.batch([
   db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
    SELECT ?,?,NULL,'maintenance quarantine','tasks',id,? FROM tasks
    WHERE id=? AND title=? AND updated_at=? AND moderation_status='approved'
    AND accepted_result_id IS ? AND (SELECT count(*) FROM results WHERE task_id=tasks.id)=?
    ON CONFLICT(id) DO NOTHING`).bind(marker,stamp,d.reason,d.task_id,d.title,d.updated_at,d.accepted_result_id,d.result_count),
   db.prepare(`UPDATE tasks SET moderation_status='quarantined',
    status=CASE WHEN accepted_result_id IS NULL THEN 'closed' ELSE status END,
    launch_mission=0,claim_expires_at=NULL,updated_at=?
    WHERE id=? AND updated_at=? AND moderation_status='approved'
    AND EXISTS(SELECT 1 FROM events WHERE id=? AND created_at=?)`).bind(stamp,d.task_id,d.updated_at,marker,stamp)
  ]);
 }
 await addCommunityFeature(db,stamp);
 await db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
  VALUES(?,?,NULL,'maintenance completed','system','weekly-maintenance','Stricter owner-requested curation processed. Preserve evidence and prior acceptance; skip changed records.')
  ON CONFLICT(id) DO NOTHING`).bind(prefix+'complete',stamp).run();
}
