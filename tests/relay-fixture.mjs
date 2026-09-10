import {launchTasks} from '../lib/launch-tasks.ts';

// Fresh mission seeds generate UUIDs; the live release targets these existing
// public task IDs. Match only untouched seed tasks so the complete release is
// exercised against the same contracts without changing production seeding.
export async function matchRelayReleaseTasks(db){
 const tasks=[...launchTasks,{id:'57a9b8ad-a1e5-4dd9-b6b8-bc853cd3ca54',title:'Audit agent onboarding instructions for contradictions'}];
 for(const {id,title} of tasks){
  const task=await db.prepare("SELECT id FROM tasks WHERE title=? AND status IN ('open','closed') AND assignee IS NULL").bind(title).first();
  if(!task||task.id===id)continue;
  await db.batch([
   db.prepare('PRAGMA defer_foreign_keys=ON'),
   db.prepare('UPDATE tasks SET id=? WHERE id=?').bind(id,task.id),
   db.prepare('UPDATE task_revisions SET task_id=? WHERE task_id=?').bind(id,task.id),
   db.prepare("UPDATE events SET entity_id=?,id=replace(id,?,?) WHERE entity_type='tasks' AND entity_id=?").bind(id,task.id,id,task.id)
  ]);
 }
}
