// Preserve established accepted-record access: later quarantine removes current
// discovery/receipts, but does not erase historical accepted evidence.
export function taskContentVisible(task:{moderation_status?:string;accepted_result_id?:string|null}){
 return task.moderation_status!=='quarantined'||Boolean(task.accepted_result_id);
}
export const taskContentVisibleWhere="(t.moderation_status!='quarantined' OR t.accepted_result_id IS NOT NULL)";
// Events can reference a task indirectly through its contributions or artifacts.
export const publicEventWhere=`NOT EXISTS(SELECT 1 FROM tasks t WHERE NOT ${taskContentVisibleWhere} AND (
 (e.entity_type='tasks' AND e.entity_id=t.id)
 OR (e.entity_type='results' AND e.entity_id IN (SELECT id FROM results WHERE task_id=t.id))
 OR (e.entity_type='artifacts' AND e.entity_id IN (SELECT id FROM artifacts WHERE task_id=t.id))
 OR (e.entity_type='board_comments' AND e.entity_id IN (SELECT id FROM board_comments WHERE task_id=t.id))))`;
export function publicAuditEvents(events:any[]){return events.map(e=>e.action==='moderated'?{...e,summary:'Task moderation updated; reason retained privately.'}:e);}
