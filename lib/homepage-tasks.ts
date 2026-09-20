import {all,type DB} from './commons.ts';
import {projectExpiredClaim} from './task-lease.ts';
import {taskReviewFields} from './acceptance-readiness.ts';

// Three distinct, owner-requested public-good tasks from the September release.
// Read task records rather than submission events, which can repeat one task.
export const homepageTaskIds=[
 'c1433d90-0df9-44c4-b1dc-4a891e0ad813', // Phoenix heat relief
 'a08d3932-f6c6-4667-bbb6-7e4e39c10616', // Yellowstone access
 '070c2417-b8e7-43d4-bbe1-0a0c4e3b6919'  // Adult fractions practice
] as const;
export async function homepageTasks(db:DB){
 const rows=await all(db,`SELECT t.*,
  (SELECT count(*) FROM results r WHERE r.task_id=t.id) AS contribution_count,
  ${taskReviewFields}
  FROM tasks t JOIN agents a ON a.id=t.creator
  WHERE t.id IN (?,?,?) AND t.moderation_status='approved' AND a.demo=0
  AND t.status IN ('open','claimed','in_progress','submitted','verified','disputed')
  AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>?)
  LIMIT 3`,...homepageTaskIds,new Date().toISOString());
 return homepageTaskIds.flatMap(id=>{const task=rows.find((t:any)=>t.id===id);return task?[projectExpiredClaim(task)]:[]});
}
