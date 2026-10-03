'use client';
import {moderationText} from '@/lib/moderation-copy';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
type Candidate={id:string;title:string;result_id:string;revision:number;assessment_status:string|null;assessment_revision:number|null;assessment_at:number|null;error_code:string|null;assessment:any;task:any;diagnostic?:{failure_phase:string;elapsed_ms:number;provider_error_code:number|null}|null};
export default function ResolutionCard({candidate:c,onSaved,disabled=false}:{candidate:Candidate;onSaved:()=>Promise<void>;disabled?:boolean}){
 const task=c.task,assessment=c.assessment_status==='complete'?c.assessment:null;
 const current=Boolean(assessment&&task&&c.assessment_revision===(task.revision||1));
 const identity=JSON.stringify([c.result_id,c.assessment_revision,c.assessment_at,assessment]);
 const suggestion=moderationText(assessment?.next_action||'');
 const [draft,setDraft]=useState({identity,text:suggestion,dirty:false,changed:false});
 // Reconcile new props before rendering. A refresh may finish an assessment
 // while this keyed card remains mounted; owner edits always win until reset.
 if(draft.identity!==identity)setDraft({identity,text:draft.dirty?draft.text:suggestion,dirty:draft.dirty,changed:draft.dirty});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[refreshPending,setRefreshPending]=useState(false),[uncertain,setUncertain]=useState(false);
 const posting=useRef(false);
 async function refreshSaved(){setBusy(true);setError('');try{await onSaved();setRefreshPending(false)}catch(e){setRefreshPending(true);setError((saved?'The handoff was saved, but the queues could not refresh. ':'')+(e instanceof Error?e.message:'Unable to refresh.'))}finally{setBusy(false)}}
 async function save(){if(!current||disabled||posting.current||saved||uncertain)return;posting.current=true;setBusy(true);setError('');let responseReceived=false;
  const payload={action:'handoff',task_id:c.id,next_action:draft.text.trim(),source_urls:task.next_action_sources||task.relay_leg?.source_urls||[],source_expectations:task.source_expectations||[],desired_output:task.next_action_output||task.expected_output,
   useful_progress:task.next_action_progress||task.relay_leg?.useful_progress||'Check one source and note what remains.',max_minutes:task.relay_leg?.max_minutes||5,kind:'contribution',result_id:c.result_id,
   expected_revision:task.revision||1,reason:'Relay assessed the corrected result; moderation reviewed and set a specific next step.'};
  try{
   const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});responseReceived=!r.ok;const j=await r.json();
   if(!r.ok)throw new Error(j.error?.message||'Could not save handoff.');
   if(!j.data||typeof j.data!=='object')throw new Error('The save returned an unreadable response.');
   setDraft(d=>({...d,dirty:false,changed:false}));setSaved('Public handoff saved.');
   try{await onSaved();setRefreshPending(false)}catch(e){setRefreshPending(true);setError('The handoff was saved, but the queues could not refresh. '+(e instanceof Error?e.message:'Unable to refresh.'))}
  }catch(e){if(!responseReceived){setUncertain(true);setRefreshPending(true);setError('The save outcome is unknown. Inspect the current task before another edit. '+(e instanceof Error?e.message:'No confirmation was received.'))}else setError(e instanceof Error?e.message:'Could not save handoff.')}
  finally{posting.current=false;setBusy(false)}
 }
 const status=({running:'Running — Relay is checking the new work.',deferred:'Deferred — waiting for an available hourly assessment slot.',failed:'Failed — inspect the task and reviews directly. This attempt will not retry automatically.',complete:'Complete — private advisory assessment.'} as Record<string,string>)[c.assessment_status||'']||'Pending — waiting for the next enabled hourly run.';
 return <article className="result-card"><h3>{c.title}</h3><a href={'/tasks/'+c.id+'#result-'+c.result_id}>Read the full task and correction</a>
 <p role="status">{status}</p>{c.assessment_at!=null&&<p className="meta">Attempt started <time dateTime={new Date(c.assessment_at).toISOString()}>{new Date(c.assessment_at).toISOString()}</time>{c.error_code&&<> · {c.error_code}</>}</p>}
 {c.assessment_status==='failed'&&<section aria-label="Assessment failure and recovery"><p>{c.diagnostic?<>Failure phase: <code>{c.diagnostic.failure_phase}</code> · Elapsed: {(c.diagnostic.elapsed_ms/1000).toFixed(1)} seconds · Provider code: {c.diagnostic.provider_error_code??'not recorded'}</>:'No detailed diagnostic was recorded for this attempt.'}</p><p>Inspect the candidate, completion criteria and reviews directly. Set a useful next step in <a href={'/moderation?task='+c.id+'#handoffs'}>Task handoffs</a>; a successful AI assessment is not required for that edit or for a review-qualified moderation check. Enabling hourly assessments does not retry this failed attempt. Unknown provider usage keeps its existing reservation.</p></section>}
 {!task&&<p role="status">Current task data is unavailable. Refresh before editing the handoff.</p>}
 {assessment&&<><p><strong>{assessment.outcome==='ready_for_owner_check'?'Review-qualified; moderation check needed':assessment.outcome==='unresolved'?'Dispute still unclear':'More work needed'}</strong></p><p>{moderationText(assessment.summary)}</p>{assessment.missing?.length>0&&<ul>{assessment.missing.map((m:string,i:number)=><li key={i}>{moderationText(m)}</li>)}</ul>}
 <p>Live sources read: {assessment.source_reads?.filter((s:any)=>s.readable).length||0} of {assessment.source_reads?.length||0}. Source excerpts can be incomplete.</p>
 {task&&!current&&<p role="status">Stale assessment: revision {c.assessment_revision}; current task revision {task.revision||1}. Read the current contract before acting.</p>}
 {assessment.outcome==='ready_for_owner_check'?<p><a href="#owner-check">Inspect the review-qualified work</a> before deciding. Relay cannot accept it.</p>:<>
 <label>Suggested public next step<textarea maxLength={1200} value={draft.text} disabled={!current||disabled||busy||uncertain||Boolean(saved)} onChange={e=>{setDraft(d=>({...d,text:e.target.value,dirty:true}))}}/></label>
 {draft.changed&&<p role="status">The assessment changed; your unsaved edit is preserved. Compare it with the latest suggestion before saving.</p>}
 {draft.dirty&&<button type="button" disabled={busy} onClick={()=>setDraft({identity,text:suggestion,dirty:false,changed:false})}>Use latest assessment suggestion</button>}
 <p className="meta">Public edit reason: Relay assessed the corrected result; moderation reviewed and set a specific next step.</p>
 <Button variant="outline" disabled={!current||disabled||busy||Boolean(saved)||uncertain||draft.text.trim().length<10} onClick={()=>void save()}>{busy?'Saving or refreshing…':saved?'Handoff saved':'Save this handoff after reviewing it'}</Button></>}
 <details><summary>Assessment record</summary><pre>{JSON.stringify({...assessment,summary:moderationText(assessment.summary),missing:assessment.missing?.map(moderationText),next_action:moderationText(assessment.next_action||''),notice:moderationText(assessment.notice||'')},null,2)}</pre></details></>}
 {saved&&<p role="status">{saved}</p>}{uncertain&&<p role="status">The earlier save outcome remains unknown. Inspect the current task before starting another edit.</p>}{error&&<p role="alert">{error}</p>}{refreshPending&&<Button variant="outline" disabled={busy} onClick={()=>void refreshSaved()}>Retry refresh</Button>}{uncertain&&!refreshPending&&<Button variant="outline" disabled={busy||disabled||!current} onClick={()=>{setUncertain(false);setError('')}}>I inspected the current task; start a new edit</Button>}</article>;
}
