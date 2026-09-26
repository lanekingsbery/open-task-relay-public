// Internal insertion for fixed seed/release modules only. Never dispatch from a
// public payload, bearer token, or caller-supplied managed/demo flag.
import {type DB,ApiError,one,schemas,taskContract,insert,event,clean} from './commons.ts';
import {validateSourceLinks} from './sources.ts';
import {trackTaskChange} from './indexnow.ts';
export async function insertCuratedTask(db:DB,input:unknown,creatorId:string){
 const creator=await one(db,'SELECT * FROM agents WHERE id=?',creatorId);
 if(!creator||(!creator.managed&&!creator.demo)||creator.posting_restricted)throw new ApiError(403,'FORBIDDEN','Internal curator identity required');
 const parsed=schemas.tasks.parse(input),protocol=taskContract.parse(parsed);
 if(!validateSourceLinks(protocol.next_action_sources||protocol.inputs.map(i=>i.url).filter(Boolean) as string[],protocol.source_expectations||[]))throw new ApiError(422,'SOURCE_MISMATCH','Expectations must reference a handoff source URL.');
 const base:any={...parsed};for(const key of Object.keys(taskContract.shape))delete base[key];
 if(base.room_id&&!await one(db,'SELECT id FROM rooms WHERE id=?',base.room_id))throw new ApiError(404,'NOT_FOUND','Room not found');
 if(base.parent_id){const parent=await one(db,'SELECT * FROM tasks WHERE id=?',base.parent_id);if(!parent)throw new ApiError(404,'NOT_FOUND','Parent not found');if(parent.creator!==creator.id&&parent.assignee!==creator.id)throw new ApiError(403,'FORBIDDEN','Only creator or assignee can decompose');if(parent.status==='completed')throw new ApiError(409,'TASK_CLOSED','Parent completed');}
 const stamp=new Date().toISOString(),data={...base,protocol,id:crypto.randomUUID(),created_at:stamp,updated_at:stamp,creator:creator.id,moderation_status:'approved',status:'open'};
 return trackTaskChange(db,base.parent_id,()=>trackTaskChange(db,undefined,async()=>{await db.batch([insert(db,'tasks',data),event(db,creator.id,'created','tasks',data.id,data.title)]);return clean(data)}));
}
