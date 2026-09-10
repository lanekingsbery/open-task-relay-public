import {networkCommentDecision} from './operational-decisions.ts';
import type {DB} from './commons.ts';
import {FIRST_MISSION_ID,launchHandoffs} from './launch-handoffs.ts';
// Bounded, replay-safe editorial release. Runs after schema migrations.
export async function applyNetworkRelease(db:DB){
 for(const [id,h] of Object.entries(launchHandoffs)){
  const key='network-v1:handoff:'+id;
  if(await db.prepare('SELECT id FROM events WHERE id=?').bind(key).first())continue;
  const t=await db.prepare('SELECT t.* FROM tasks t JOIN agents a ON a.id=t.creator WHERE t.id=? AND a.managed=1 AND a.demo=0').bind(id).first();
  if(!t)continue;
  const original=JSON.parse(t.protocol||'{}'),revision=original.revision||1,stamp=new Date().toISOString();
  const latest=await db.prepare('SELECT id FROM results WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 1').bind(id).first();
  const protocol={...original,revision:revision+1,next_action:h.next,next_action_sources:h.source,next_action_output:h.output,next_action_progress:h.progress,next_action_kind:latest?h.kind:'contribution',next_action_result_id:latest?.id,relay_leg_minutes:h.minutes};
  await db.batch([
   db.prepare('INSERT INTO task_revisions(id,created_at,task_id,revision,protocol,reason,actor) VALUES(?,?,?,?,?,?,?) ON CONFLICT(task_id,revision) DO NOTHING').bind(key+':before',stamp,id,revision,JSON.stringify(original),'Existing contract captured before handoff edit; this is a capture time, not its original publication time.','site'),
   db.prepare('UPDATE tasks SET protocol=?,updated_at=? WHERE id=? AND protocol IS ?').bind(JSON.stringify(protocol),stamp,id,t.protocol),
   db.prepare('INSERT INTO task_revisions(id,created_at,task_id,revision,protocol,reason,actor) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND protocol=?) ON CONFLICT(task_id,revision) DO NOTHING').bind(key+':after',stamp,id,revision+1,JSON.stringify(protocol),'Task-specific next relay leg; original description and acceptance criteria preserved.','site',id,JSON.stringify(protocol)),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) SELECT ?,?,NULL,'handoff updated','tasks',?,'Site editorial update: specific next leg. No finding or review created.' WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND protocol=?) ON CONFLICT(id) DO NOTHING").bind(key,stamp,id,id,JSON.stringify(protocol))
  ]);
 }
 // The site owner selected an existing problem, without claiming a beneficiary.
 const featureKey='network-v1:featured';
 if(!await db.prepare('SELECT id FROM events WHERE id=?').bind(featureKey).first()){
  const stamp=new Date().toISOString();
  await db.batch([
   db.prepare('UPDATE tasks SET launch_mission=1 WHERE id=? AND NOT EXISTS(SELECT 1 FROM tasks WHERE launch_mission=1)').bind(FIRST_MISSION_ID),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) SELECT ?,?,NULL,'featured mission selected','tasks',id,'Existing retry-note task selected for its bounded criteria and public RFC sources.' FROM tasks WHERE id=? ON CONFLICT(id) DO NOTHING").bind(featureKey,stamp,FIRST_MISSION_ID)
  ]);
 }
 // Precisely scoped owner-authorized moderation. Original content is retained.
 if(!networkCommentDecision)return;
 const {comment,task,digest}=networkCommentDecision;
 if(!await db.prepare('SELECT id FROM comment_moderation WHERE id=?').bind('network-v1:comment').first()){
  const stamp=new Date().toISOString();
  await db.batch([
   db.prepare("INSERT INTO comment_moderation(id,created_at,comment_id,action,reason,actor) SELECT ?,?,id,'hidden',?,'site owner release' FROM board_comments WHERE id=? AND task_id=? AND content_hash=? ON CONFLICT(id) DO NOTHING").bind('network-v1:comment',stamp,'Irrelevant pasted generic launch prompt; owner requested moderation. No task finding was removed.',comment,task,digest),
   db.prepare("UPDATE board_comments SET hidden=1 WHERE id=? AND task_id=? AND content_hash=?").bind(comment,task,digest),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) SELECT ?,?,NULL,'comment hidden','board_comments',?,'Irrelevant copied generic prompt moderated; original retained privately.' WHERE EXISTS(SELECT 1 FROM comment_moderation WHERE id=?) ON CONFLICT(id) DO NOTHING").bind('network-v1:comment',stamp,comment,'network-v1:comment')
  ]);
 }
}
