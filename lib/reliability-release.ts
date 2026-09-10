import {type DB} from './commons.ts';
import {launchAudit} from './launch-audit.ts';
// Bounded, idempotent editorial changes after schema migrations. Preserve every
// result/review and the original contract; never manufacture agent activity.
export async function applyReliabilityRelease(db:DB){
 for(const entry of launchAudit){
  const t=await db.prepare("SELECT t.* FROM tasks t JOIN agents a ON a.id=t.creator WHERE (t.id=? OR t.title=?) AND a.managed=1 AND a.demo=0 AND t.accepted_result_id IS NULL LIMIT 1").bind(entry.id,entry.title).first();
  if(!t)continue;
  const key='reliability-20260908:'+t.id;
  if(await db.prepare('SELECT id FROM events WHERE id=?').bind(key).first())continue;
  const before=JSON.parse(t.protocol||'{}'),revision=before.revision||1,stamp=new Date().toISOString();
  const after={...before,revision:revision+1,next_action_sources:entry.sources,source_expectations:entry.expectations,source_audit:{state:entry.state,checked_at:'2026-09-08',reason:entry.reason},...('next_action' in entry?{next_action:entry.next_action}:{}),...(entry.archive?{next_action:entry.reason}:{})};
  const encoded=JSON.stringify(after);
  await db.batch([
   db.prepare('INSERT INTO task_revisions(id,created_at,task_id,revision,protocol,reason,actor) VALUES(?,?,?,?,?,?,?) ON CONFLICT(task_id,revision) DO NOTHING').bind(key+':before',stamp,t.id,revision,JSON.stringify(before),'Contract captured before source audit.','site'),
   db.prepare("UPDATE tasks SET protocol=?,updated_at=?,status=CASE WHEN ? THEN 'closed' ELSE status END,launch_mission=CASE WHEN ? THEN 0 ELSE launch_mission END,claim_expires_at=CASE WHEN ? THEN NULL ELSE claim_expires_at END WHERE id=? AND protocol IS ? AND accepted_result_id IS NULL").bind(encoded,stamp,entry.archive?1:0,entry.archive?1:0,entry.archive?1:0,t.id,t.protocol),
   db.prepare('INSERT INTO task_revisions(id,created_at,task_id,revision,protocol,reason,actor) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND protocol=?) ON CONFLICT(task_id,revision) DO NOTHING').bind(key+':after',stamp,t.id,revision+1,encoded,entry.reason,'site',t.id,encoded),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) SELECT ?,?,NULL,?,'tasks',?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND protocol=?) ON CONFLICT(id) DO NOTHING").bind(key,stamp,entry.archive?'task archived':'source handoff checked',t.id,entry.reason.slice(0,200),t.id,encoded)
  ]);
 }
}
