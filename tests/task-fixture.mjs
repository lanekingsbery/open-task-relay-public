// Explicit local setup. No public handler or HTTP creation transport is used.
import assert from 'node:assert/strict';
import {schemas,taskContract,one,insert,event,clean,ApiError,authenticate,body,errorResponse} from '../lib/commons.ts';
import {validateSourceLinks} from '../lib/sources.ts';
import {trackTaskChange} from '../lib/indexnow.ts';
export async function createTaskFixture(db,input,agent){
 const parsed=schemas.tasks.parse(input),protocol=taskContract.parse(parsed),base={...parsed};
 if(!validateSourceLinks(protocol.next_action_sources||protocol.inputs.map(i=>i.url).filter(Boolean),protocol.source_expectations||[]))throw new ApiError(422,'SOURCE_MISMATCH','Expectations must reference a handoff source URL.');
 for(const key of Object.keys(taskContract.shape))delete base[key];
 if(base.room_id&&!await one(db,'SELECT id FROM rooms WHERE id=?',base.room_id))throw new ApiError(404,'NOT_FOUND','Room not found');
 if(base.parent_id){const parent=await one(db,'SELECT * FROM tasks WHERE id=?',base.parent_id);if(parent.creator!==agent.id&&parent.assignee!==agent.id)throw new ApiError(403,'FORBIDDEN','Only creator or assignee can decompose');if(parent.status==='completed')throw new ApiError(409,'TASK_CLOSED','Parent completed');}
 const stamp=new Date().toISOString(),data={...base,protocol,id:crypto.randomUUID(),created_at:stamp,updated_at:stamp,creator:agent.id,moderation_status:agent.managed||agent.demo?'approved':'pending',status:'open'};
 return trackTaskChange(db,base.parent_id,()=>trackTaskChange(db,undefined,async()=>{await db.batch([insert(db,'tasks',data),event(db,agent.id,'created','tasks',data.id,data.title)]);return clean(data)}));
}
export async function fixtureCall(db,path,method,input,token,expected=201,approved=true){
 const request=new Request('https://fixture.test/api/tasks',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(input)});
 try{
  const value=await body(request),agent=await authenticate(db,request);
  const task=await createTaskFixture(db,value,agent);
  assert.equal(expected,201);if(!approved)return task;await db.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(task.id).run();return {...task,moderation_status:'approved'};
 }catch(e){if(expected===201)throw e;const response=errorResponse(e);assert.equal(response.status,expected);}
}

// Reproduce a historical replay after a moderation handoff without copying live data.
export async function replayFinishingFixture(db,taskId){
 const original=await db.prepare('SELECT * FROM relay_finishing WHERE task_id=? ORDER BY created_at LIMIT 1').bind(taskId).first();
 const handoff=await db.prepare('SELECT * FROM task_handoffs WHERE id=?').bind('finish:'+original.state_key).first();
 const task=await db.prepare('SELECT protocol FROM tasks WHERE id=?').bind(taskId).first();
 const before=JSON.parse(task.protocol),stale=JSON.parse(handoff.after_protocol),after={...before,handoff_revision:before.handoff_revision+1};
 for(const key of ['next_action','next_action_sources','next_action_output','next_action_progress','next_action_kind','next_action_result_id','relay_leg_minutes'])after[key]=stale[key];
 const state='b'.repeat(64),now=Date.now()+1000,stamp=new Date(now).toISOString();
 await db.batch([
  db.prepare("INSERT INTO relay_finishing(state_key,task_id,created_at,status,source_version,source_result_ids,decision_json,candidate_id) VALUES (?,?,?,'complete',?,?,?,?)").bind(state,taskId,now,original.source_version,original.source_result_ids,original.decision_json,original.candidate_id),
  db.prepare('INSERT INTO task_handoffs(id,task_id,created_at,actor,before_protocol,after_protocol,reason) VALUES (?,?,?,?,?,?,?)').bind('finish:'+state,taskId,stamp,handoff.actor,task.protocol,JSON.stringify(after),handoff.reason),
  db.prepare('UPDATE tasks SET protocol=?,updated_at=? WHERE id=?').bind(JSON.stringify(after),stamp,taskId)
 ]);
 return state;
}
