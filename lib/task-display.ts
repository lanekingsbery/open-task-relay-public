import {humanCopy,excerpt} from './human-copy.ts';
import {statusLabel} from './public-work.ts';
import {relayLeg} from './relay.ts';

// Human labels only. Stored states, contracts and machine instructions are unchanged.
export const HUMAN_BOARD_PAGE_SIZE=18;
export function humanTaskStatus(task:any){
 const label=statusLabel(task);
 if(['Awaiting moderation','Closed / quarantined','Expired','Archived','Accepted result'].includes(label))return label==='Accepted result'?'Accepted':label;
 if(task.status==='premise_stale')return 'Task needs updating';
 if(task.owner_attention_required??task.acceptance_ready)return 'Awaiting moderation decision';
 if(task.owner_verification_failed)return 'More work needed';
 if(task.completion_review_needed)return 'Needs completion check';
 if(task.needs_independent_check)return 'Needs first review';
 return ({Open:'Available','Awaiting review':'Needs review','Reviewed · completion not established':'Completion not confirmed','Premise stale · creator action needed':'Task needs updating','Review-qualified · moderation verification required':'Awaiting moderation decision'} as Record<string,string>)[label]||label;
}
export function completionAssessmentLabel(value?:string|null){
 return value==null?'Not assessed':({complete:'Complete',partial:'Partially complete',unknown:'Completion not determined'} as Record<string,string>)[value]||value;
}
export function taskPreview(task:any){
 const copy=humanCopy(task),leg=relayLeg(task);
 const text=String(task.objective||task.description||'');
 const location=text.match(/^Local focus: ([^\n]+?, [A-Z]{2})\. /)?.[1];
 const benefit=text.replace(/^Local focus: [^\n]+?, [A-Z]{2}\. /,'').split(/\n\s*\n/)[0];
 const sentence=(value:string,limit:number)=>excerpt(value.match(/^[\s\S]*?[.!?](?=\s+[A-Z“"]|$)/)?.[0]||value,limit);
 const blurb=sentence(copy.blurb===excerpt(text,170)?benefit:copy.blurb,220);
 let next=leg.next_action.replace(/^Read existing contributions first; do not repeat completed work\.\s+(?=\S)/,'');
 if(task.status==='completed')next='Read the findings, sources, and review record.';
 else if(task.status==='premise_stale')next='The creator needs to update this task before work can continue.';
 else if(task.status==='closed')next='Read the retained task record.';
 else if(task.status==='disputed')next='Check the challenged claim and its supporting evidence.';
 else if(task.owner_attention_required??task.acceptance_ready)next='Read the candidate while moderation checks the task requirements.';
 else if(leg.handoff_needs_refresh||task.completion_review_needed||task.needs_independent_check||task.next_action_kind==='review'||(!task.next_action&&leg.kind==='review'))next='Check the latest result against the task requirements.';
 else if(!task.next_action)next='Check one unresolved part against the starting sources.';
 return {title:excerpt(copy.title,96),blurb,location,next:sentence(next,180),minutes:leg.max_minutes};
}
