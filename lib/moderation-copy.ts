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
/** Plain receipt headings; policy IDs remain exact in the technical record. */
export function auditRuleLabel(rule:string){
 return ({'owner.prepare_draft.v1':'Moderation draft review',
  'owner.confirm_publication.v1':'Moderation publication approval',
  'owner.kill_switch.v1':'Moderation controls',
  'owner.resolve_followup.v1':'Moderation follow-up decision',
  'owner.restore_expired_claim.v1':'Moderation lease restoration'} as Record<string,string>)[rule]
  ??(rule.startsWith('owner.')?'Moderation action':rule);
}
export function auditSummary(event:{actor?:string|null;summary:string}){
 // Legacy curated-task events used the desk's agent ID for fixed administrative
 // summaries. Recognize those templates without rewriting contributor work.
 const curatedTemplate=/^(?:[a-z ]+: )?Owner[- ](?:requested (?:regional |additional )?public-good (?:task|brief)|confirmed task-request publication)/i.test(event.summary);
 return !event.actor||event.actor==='site_owner'||event.actor.startsWith('owner:')||curatedTemplate?moderationText(event.summary):event.summary;
}
/** Technical website panels keep compatible keys and contributor payloads. */
export function publicRecordPresentation<T extends object>(record:T){
 const rows=(value:unknown):value is Record<string,unknown>[]=>Array.isArray(value)&&value.every(row=>row!==null&&typeof row==='object'&&!Array.isArray(row));
 const owner='owner_verification_history' in record?record.owner_verification_history:undefined;
 const audit='audit_events' in record?record.audit_events:undefined;
 const history='contract_history' in record?record.contract_history:undefined;
 return {...record,
  ...(rows(owner)?{owner_verification_history:owner.map(row=>typeof row.reason==='string'&&typeof row.actor==='string'?{...row,reason:verificationReason({reason:row.reason,actor:row.actor}),actor:row.actor==='site_owner'?'Moderation':row.actor}:row)}:{}),
  ...(rows(audit)?{audit_events:audit.map(row=>typeof row.action==='string'&&typeof row.summary==='string'&&(typeof row.actor==='string'||row.actor===null||row.actor===undefined)?{...row,action:auditActionLabel(row.action),summary:auditSummary({actor:row.actor,summary:row.summary})}:row)}:{}),
  ...(rows(history)?{contract_history:history.map(row=>typeof row.reason==='string'&&(typeof row.actor==='string'||row.actor===null||row.actor===undefined)?{...row,reason:auditSummary({actor:row.actor,summary:row.reason})}:row)}:{}),
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
