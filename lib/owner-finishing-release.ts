import {hash,ApiError,type DB} from './commons.ts';
import {finishingState,finishWorkedTask,type FinishingState,type FinishingDecision} from './relay-finishing.ts';
import {acceptReviewed} from './moderation.ts';
import {ownerFinishingDecisions,ownerConclusions} from './operational-decisions.ts';
export type OwnerFinishingDecision={task_id:string;evidence_digest:string;source_version:string;decision:FinishingDecision;acceptance?:{reason:string;review_basis:string;review_ids:string[];conclusion:string}};
export function finishingEvidence(s:FinishingState){return {revision:s.task.revision,criteria:s.task.acceptance_criteria,expected_output:s.task.expected_output,
 results:s.external.map(r=>({id:r.id,content:r.content,evidence:r.evidence})).sort((a,b)=>a.id.localeCompare(b.id)),
 reviews:s.reviews.map(v=>({id:v.id,result_id:v.result_id,content:v.content,verdict:v.verdict,completeness:v.completeness})).sort((a,b)=>a.id.localeCompare(b.id)),
 holds:s.holds.map(v=>({id:v.id,outcome:v.outcome,reason:v.reason}))};}
/** Exact owner-authorized release instructions, never a readiness-based acceptance loop.
 * Public forks receive an empty list. Changed evidence cancels the decision. */
export async function applyOwnerFinishingRelease(db:DB,decisions:OwnerFinishingDecision[]=ownerFinishingDecisions){
 for(const d of ownerConclusions){
  const r=await db.prepare('SELECT r.content FROM tasks t JOIN results r ON r.id=t.accepted_result_id WHERE t.id=? AND r.id=?').bind(d.task_id,d.result_id).first<{content:string}>();
  if(r&&await hash(r.content)===d.content_sha256)await db.prepare('INSERT INTO task_conclusions(result_id,conclusion,actor,created_at) VALUES (?,?,?,?) ON CONFLICT(result_id) DO NOTHING').bind(d.result_id,d.conclusion,'site_owner',new Date().toISOString()).run();
 }
 for(const d of decisions){
  try{
   const s=await finishingState(db,d.task_id);if(!s)continue;
   if(await hash(JSON.stringify(finishingEvidence(s)))!==d.evidence_digest)continue;
   const out=await finishWorkedTask(db,s,d.decision,d.source_version);
   const candidate=typeof out.candidate_id==='string'?out.candidate_id:s.latest.id;
   if(d.acceptance)await acceptReviewed(db,{task_id:d.task_id,result_id:candidate,criteria_checked:true,...d.acceptance});
  }catch(e){if(e instanceof ApiError&&[403,409,422].includes(e.status))continue;throw e;}
 }
}
