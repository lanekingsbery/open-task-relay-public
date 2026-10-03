/** Website presentation only. Never apply to contributor text, URLs, or stored provenance. */
export function moderationText(value:string){
 return value
  .replace(/\b(?:Lane\s+Kingsbery|L\.\s+Kingsbery)\b|\bLane\s+K\.(?=\s|$)/gi,'OTR')
  .replace(/\blanekingsbery@[a-z0-9.-]+\.[a-z]{2,}\b/gi,'repository@opentaskrelay.org')
  .replace(/\b(?:the\s+)?(?:site[- ]owner|owner)(?=[ -]+(?:decision|approval|hold|control|review|verification|check|curation|curated|follow-up|maintenance|requested|authorized|selected|release|confirmed|reviewed|explicitly|held|enabled|paused|resolved|restored|found|must|can|may|only|reopening|sign-in|access)s?\b)/gi,
   match=>/^[A-Z]/.test(match)?'Moderation':'moderation')
  .replace(/\b(?:the\s+)?owner(?=\s+(?:to\s+(?:check|decide)|for\s+(?:review|curated tasks)))\b/gi,'moderation');
}
export function moderationActor(actor?:string|null){
 return !actor||actor==='site_owner'||actor.startsWith('owner:')||actor.includes('@')?'Moderation':actor;
}
export function verificationReason(record:{actor?:string;reason:string}){
 return record.actor==='site_owner'?moderationText(record.reason):record.reason;
}
export function auditActionLabel(action:string){
 return action==='owner verification failed'?'More work needed':moderationText(action);
}
export function auditSummary(event:{actor?:string|null;summary:string}){
 // Legacy curated-task events used the desk's agent ID for fixed administrative
 // summaries. Recognize those templates without rewriting contributor work.
 const curatedTemplate=/^(?:[a-z ]+: )?Owner[- ](?:requested (?:regional |additional )?public-good (?:task|brief)|confirmed task-request publication)/i.test(event.summary);
 return !event.actor||event.actor==='site_owner'||event.actor.startsWith('owner:')||curatedTemplate?moderationText(event.summary):event.summary;
}
/** Technical website panels keep compatible keys and contributor payloads. */
export function publicRecordPresentation<T extends {owner_verification_history?:{actor?:string;reason:string}[];audit_events?:{actor?:string|null;action:string;summary:string}[];contract_history?:{actor?:string|null;reason:string}[]}>(record:T){
 return {...record,
  ...(record.owner_verification_history?{owner_verification_history:record.owner_verification_history.map(row=>({...row,reason:verificationReason(row),actor:row.actor==='site_owner'?'Moderation':row.actor}))}:{}),
  ...(record.audit_events?{audit_events:record.audit_events.map(row=>({...row,action:auditActionLabel(row.action),summary:auditSummary(row)}))}:{}),
  ...(record.contract_history?{contract_history:record.contract_history.map(row=>({...row,reason:auditSummary({actor:row.actor,summary:row.reason})}))}:{}),
 };
}
/** A copy for display; authenticated API receipts retain exact audit fields. */
export function receiptPresentation<T extends {actor:string;reason:string}>(record:T){
 const copy={...record,actor:moderationActor(record.actor),reason:moderationText(record.reason)};
 for(const key of ['before_json','after_json'] as const){
  const value=(copy as Record<string,unknown>)[key];
  if(typeof value!=='string')continue;
  try{const state=JSON.parse(value);if(state&&typeof state.reason==='string'){
   (copy as Record<string,unknown>)[key]=JSON.stringify({...state,reason:moderationText(state.reason)});
  }}catch{/* Keep unfamiliar audit formats intact. */}
 }
 return copy;
}
