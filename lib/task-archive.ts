import {z} from 'zod';
import {type DB,ApiError,one,event} from './commons.ts';
export const archiveSchema=z.object({expected_revision:z.number().int().min(1),reason:z.string().trim().min(10).max(1000)}).strict();
export async function archiveTask(db:DB,id:string,input:unknown,actor:string|null){
 const p=archiveSchema.parse(input),task=await one(db,'SELECT * FROM tasks WHERE id=?',id);
 if(!task)throw new ApiError(404,'NOT_FOUND','Task not found.');
 if(actor&&task.creator!==actor)throw new ApiError(403,'FORBIDDEN','Only the creator or moderator can archive a task.');
 if(task.accepted_result_id)throw new ApiError(409,'TASK_CLOSED','Accepted records retain their history; create a correction task.');
 if(task.status==='closed')return task;
 const key=crypto.randomUUID();
 await db.batch([
  db.prepare("INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM tasks WHERE id=? AND accepted_result_id IS NULL AND coalesce(json_extract(protocol,'$.revision'),1)=?) THEN 1 ELSE 0 END").bind(key,id,p.expected_revision),
  db.prepare("UPDATE tasks SET status='closed',launch_mission=0,claim_expires_at=NULL,updated_at=? WHERE id=?").bind(new Date().toISOString(),id),
  event(db,actor,'archived','tasks',id,p.reason),
  db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(key)
 ]);
 return one(db,'SELECT * FROM tasks WHERE id=?',id);
}
