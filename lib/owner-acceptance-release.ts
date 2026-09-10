import {ApiError,hash,one,type DB} from './commons.ts';
import {acceptReviewed} from './moderation.ts';

import {ownerAcceptanceDecisions} from './operational-decisions.ts';
export {ownerAcceptanceDecisions} from './operational-decisions.ts';

export async function applyOwnerAcceptanceRelease(db:DB,decisions=ownerAcceptanceDecisions){
 for(const decision of decisions){
  const task=await one(db,'SELECT * FROM tasks WHERE id=?',decision.task_id);
  if(!task||task.accepted_result_id||task.revision!==decision.revision)continue;
  const result=await one(db,'SELECT * FROM results WHERE id=? AND task_id=?',decision.result_id,decision.task_id);
  if(!result||await hash(result.content)!==decision.content_sha256||await hash(JSON.stringify(task.acceptance_criteria))!==decision.criteria_sha256)continue;
  try{
   await acceptReviewed(db,{task_id:decision.task_id,result_id:decision.result_id,reason:decision.reason,criteria_checked:true});
  }catch(error){
   // A new dispute, changed state, or concurrent acceptance cancels this fixed
   // decision. Never weaken the gate or make public reads unavailable for it.
   if(error instanceof ApiError&&(error.status===409||error.status===403))continue;
   throw error;
  }
 }
}
