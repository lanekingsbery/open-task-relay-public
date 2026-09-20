import {trackTaskChange} from './indexnow.ts';
import {publicHttpsUrl,sourceExpectations,validateSourceLinks} from './sources.ts';
import {z} from 'zod';
import {MAX_RELAY_MINUTES} from './relay.ts';
import {type DB,ApiError,one,event} from './commons.ts';
export const handoffSchema=z.object({next_action:z.string().trim().min(10).max(1200),source_urls:z.array(publicHttpsUrl).max(10),source_expectations:sourceExpectations.optional(),desired_output:z.string().trim().min(10).max(1200),useful_progress:z.string().trim().min(10).max(1200),max_minutes:z.number().int().min(1).max(MAX_RELAY_MINUTES),kind:z.enum(['contribution','review']),result_id:z.string().uuid().optional(),expected_revision:z.number().int().min(1),reason:z.string().trim().min(10).max(1000)}).strict();
export async function updateHandoff(db:DB,id:string,input:unknown,actor:string|null){return trackTaskChange(db,id,()=>updateHandoffUntracked(db,id,input,actor));}
async function updateHandoffUntracked(db:DB,id:string,input:unknown,actor:string|null){
 const p=handoffSchema.parse(input),t=await db.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first();
 if(!t)throw new ApiError(404,'NOT_FOUND','Task not found.');
 if(t.accepted_result_id)throw new ApiError(409,'TASK_CLOSED','Accepted records are immutable. Create a linked correction task.');
 const before=JSON.parse(t.protocol||'{}'),revision=before.revision||1;
 if(p.expected_revision!==revision)throw new ApiError(409,'STALE_REVISION','Read the latest task before editing its next leg.');
 if(p.result_id&&!await one(db,'SELECT id FROM results WHERE task_id=? AND id=?',id,p.result_id))throw new ApiError(422,'RESULT_MISMATCH','Result belongs to another task.');
 if(!validateSourceLinks(p.source_urls,p.source_expectations||[]))throw new ApiError(422,'SOURCE_MISMATCH','Expectations must reference a handoff source URL.');
 const after={...before,revision:revision+1,next_action:p.next_action,next_action_sources:p.source_urls,source_expectations:p.source_expectations||[],next_action_output:p.desired_output,next_action_progress:p.useful_progress,relay_leg_minutes:p.max_minutes,next_action_kind:p.kind,next_action_result_id:p.result_id};
 const stamp=new Date().toISOString(),key=crypto.randomUUID();
 await db.batch([
  db.prepare('INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM tasks WHERE id=? AND protocol IS ? AND accepted_result_id IS NULL) THEN 1 ELSE 0 END').bind(key,id,t.protocol),
  db.prepare('INSERT INTO task_revisions(id,created_at,task_id,revision,protocol,reason,actor) VALUES(?,?,?,?,?,?,?) ON CONFLICT(task_id,revision) DO NOTHING').bind(key+':before',stamp,id,revision,JSON.stringify(before),'Contract captured before the next-leg edit.',actor),
  db.prepare("UPDATE tasks SET protocol=?,updated_at=?,status=CASE WHEN status IN ('premise_stale','closed') THEN 'open' ELSE status END,assignee=CASE WHEN status IN ('premise_stale','closed') THEN NULL ELSE assignee END WHERE id=?").bind(JSON.stringify(after),stamp,id),
  db.prepare('INSERT INTO task_revisions(id,created_at,task_id,revision,protocol,reason,actor) VALUES(?,?,?,?,?,?,?)').bind(key,stamp,id,revision+1,JSON.stringify(after),p.reason,actor),
  event(db,actor,'handoff updated','tasks',id,p.reason),
  db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(key)
 ]);
 return one(db,'SELECT * FROM tasks WHERE id=?',id);
}
