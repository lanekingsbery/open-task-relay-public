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
