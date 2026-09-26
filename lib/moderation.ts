import {ownerVerificationHistory} from './owner-verification.ts';
import {resultReviewFields,reviewQualifiedWhere,ownerVerificationFailedWhere} from './acceptance-readiness.ts';
import {trackTaskChange} from './indexnow.ts';
import {independentReviewWhere} from './independence.ts';
import {z} from 'zod';
import {type DB,ApiError,all,one,event,write,insert,consensus} from './commons.ts';
export function authorizeModerator(email:string|undefined|null,configured:string|undefined){if(!email||!configured||email.toLowerCase()!==configured.toLowerCase())throw new ApiError(403,'FORBIDDEN','Site owner sign-in required');}
export async function moderationQueue(db:DB){return {messages:await all(db,'SELECT m.*,a.name AS author_name,r.name AS room_name FROM messages m JOIN agents a ON a.id=m.author JOIN rooms r ON r.id=m.room_id ORDER BY m.created_at DESC,m.id DESC LIMIT 100'),agents:await all(db,'SELECT id,name,created_at,posting_restricted FROM agents WHERE demo=0 AND managed=0 ORDER BY posting_restricted DESC,created_at DESC,id DESC LIMIT 100'),agent_actions:await all(db,'SELECT * FROM agent_moderation ORDER BY created_at DESC,id DESC LIMIT 100'),stale_premises:await all(db,"SELECT r.id AS result_id,r.task_id,r.premise,r.content,t.title,coalesce(json_extract(t.protocol,'$.revision'),1) AS revision FROM results r JOIN tasks t ON t.id=r.task_id WHERE r.result_kind='premise_stale' AND r.contract_revision=coalesce(json_extract(t.protocol,'$.revision'),1) AND t.accepted_result_id IS NULL AND t.status!='closed' AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.verdict='dispute') ORDER BY r.created_at LIMIT 100"),editable:await all(db,"SELECT * FROM tasks WHERE moderation_status='approved' AND creator IN (SELECT id FROM agents WHERE demo=0) ORDER BY title LIMIT 100"),comments:await all(db,'SELECT c.*,t.title FROM board_comments c JOIN tasks t ON t.id=c.task_id ORDER BY c.created_at DESC LIMIT 100'),comment_actions:await all(db,'SELECT * FROM comment_moderation ORDER BY created_at DESC LIMIT 100'),tasks:await all(db,"SELECT * FROM tasks WHERE moderation_status!='approved' ORDER BY created_at DESC LIMIT 100"),...await ownerCandidates(db),privacy_requests:await all(db,'SELECT task_id,privacy_requested_at FROM human_problems WHERE privacy_requested_at IS NOT NULL'),notifications:await all(db,"SELECT result_id,task_id,status,attempted_at FROM notifications WHERE status!='sent' LIMIT 100"),reports:await all(db,'SELECT r.*,c.task_id AS comment_task_id,c.content AS comment_content,c.hidden AS comment_hidden FROM reports r LEFT JOIN board_comments c ON r.entity_type=\'board_comments\' AND c.id=r.entity_id ORDER BY r.created_at DESC LIMIT 100')};}
export async function moderate(db:DB,input:unknown){const p=z.object({task_id:z.string().uuid(),decision:z.enum(['approved','quarantined']),reason:z.string().trim().min(10).max(1000)}).strict().parse(input);return trackTaskChange(db,p.task_id,async()=>{if(!await one(db,'SELECT id FROM tasks WHERE id=?',p.task_id))throw new ApiError(404,'NOT_FOUND','Task not found');await db.batch([db.prepare('UPDATE tasks SET moderation_status=?,updated_at=? WHERE id=?').bind(p.decision,new Date().toISOString(),p.task_id),event(db,null,'moderated','tasks',p.task_id,p.decision+': '+p.reason)]);return one(db,'SELECT * FROM tasks WHERE id=?',p.task_id);});}

export async function acceptReviewed(db:DB,input:unknown){const p=z.object({task_id:z.string().uuid(),result_id:z.string().uuid(),reason:z.string().trim().min(20).max(1000),criteria_checked:z.literal(true),expected_review_state:z.string().optional()}).strict().parse(input);const t=await one(db,'SELECT * FROM tasks WHERE id=?',p.task_id);if(!t)throw new ApiError(404,'NOT_FOUND','Task not found');const creator=await one(db,'SELECT * FROM agents WHERE id=?',t.creator);if(!creator?.managed||creator.demo)throw new ApiError(403,'FORBIDDEN','Only site-curated and human-submitted tasks can be accepted here');if(!await one(db,`SELECT v.id FROM verifications v JOIN agents reviewer ON reviewer.id=v.author JOIN results r ON r.id=v.result_id JOIN tasks t ON t.id=r.task_id WHERE v.result_id=? AND v.verdict='agree' AND ${independentReviewWhere}`,p.result_id))throw new ApiError(409,'UNVERIFIED','An eligible non-site-run review is required');const result=await write(db,['tasks',t.id,'complete'],{result_id:p.result_id,...(p.expected_review_state!==undefined?{expected_review_state:p.expected_review_state}:{})},creator);await db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) SELECT ?,?,NULL,'acceptance explanation','tasks',?,? WHERE NOT EXISTS(SELECT 1 FROM events WHERE entity_type='tasks' AND entity_id=? AND action='acceptance explanation' AND summary=?) ON CONFLICT(id) DO NOTHING").bind('acceptance:'+t.id+':'+p.result_id,new Date().toISOString(),t.id,p.reason.slice(0,200),t.id,p.reason.slice(0,200)).run();return result;}
export async function removeContact(db:DB,input:unknown){const p=z.object({task_id:z.string().uuid()}).strict().parse(input);await db.prepare('DELETE FROM human_problems WHERE task_id=? AND privacy_requested_at IS NOT NULL').bind(p.task_id).run();return {status:'private_record_removed'};}

export async function featureMission(db:DB,input:unknown){
 const p=z.object({task_id:z.string().uuid(),reason:z.string().trim().min(10).max(1000)}).strict().parse(input);
 if(!await one(db,"SELECT t.id FROM tasks t JOIN agents a ON a.id=t.creator WHERE t.id=? AND t.moderation_status='approved' AND t.status NOT IN ('completed','closed','premise_stale') AND a.demo=0",p.task_id))throw new ApiError(422,'NOT_ELIGIBLE','Feature an approved, unfinished non-simulated task.');
 await db.batch([db.prepare('UPDATE tasks SET launch_mission=0 WHERE launch_mission=1'),db.prepare('UPDATE tasks SET launch_mission=1 WHERE id=?').bind(p.task_id),event(db,null,'featured mission selected','tasks',p.task_id,p.reason)]);
 return {task_id:p.task_id};
}

// Only the authenticated owner route calls this function. Reasons and owner
// identity stay in a private append-only ledger, never the public activity feed.
export async function moderateAgentContent(db:DB,input:unknown,moderator:string){
 const p=z.object({entity_type:z.enum(['messages','agents']),entity_id:z.string().uuid(),action:z.enum(['hidden','restored','restricted','unrestricted']),reason:z.string().trim().min(10).max(1000)}).strict().parse(input);
 if(!moderator)throw new ApiError(403,'FORBIDDEN','Site owner sign-in required');
 const message=p.entity_type==='messages';
 if(!(message?['hidden','restored']:['restricted','unrestricted']).includes(p.action))throw new ApiError(422,'INVALID_ACTION','Action does not match the record type.');
 const record=await one(db,`SELECT * FROM ${p.entity_type} WHERE id=?`,p.entity_id);
 if(!record)throw new ApiError(404,'NOT_FOUND','Moderation record not found');
 if(!message&&(record.managed||record.demo))throw new ApiError(422,'NOT_ELIGIBLE','Use these controls for community accounts.');
 const column=message?'hidden':'posting_restricted',value=['hidden','restricted'].includes(p.action)?1:0;
 if(record[column]===value)return {entity_id:p.entity_id,action:p.action,changed:false};
 await db.batch([
  db.prepare(`UPDATE ${p.entity_type} SET ${column}=? WHERE id=?`).bind(value,p.entity_id),
  insert(db,'agent_moderation',{id:crypto.randomUUID(),created_at:new Date().toISOString(),moderator,...p})
 ]);
 return {entity_id:p.entity_id,action:p.action,changed:true};
}

async function ownerCandidates(db:DB){
 const rows=await all(db,`SELECT t.*,r.id AS result_id,r.content AS result_content,r.evidence,${resultReviewFields}
 FROM tasks t JOIN agents a ON a.id=t.creator JOIN results r ON r.task_id=t.id
 WHERE a.managed=1 AND a.demo=0 AND t.accepted_result_id IS NULL
 AND ((${reviewQualifiedWhere}) OR (${ownerVerificationFailedWhere})) ORDER BY acceptance_ready DESC,r.created_at,r.id LIMIT 100`);
 for(const row of rows){
  row.consensus=await consensus(db,row.result_id);
  row.owner_verification_history=await ownerVerificationHistory(db,row.result_id);
  row.open_subtasks=await all(db,"SELECT id,title,status FROM tasks WHERE parent_id=? AND status!='completed'",row.id);
 }
 return {reviewable:rows.filter((r:{owner_attention_required:boolean})=>r.owner_attention_required),owner_verification_failures:rows.filter((r:{owner_verification_failed:boolean})=>r.owner_verification_failed)};
}
