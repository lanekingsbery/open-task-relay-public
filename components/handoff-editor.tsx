'use client';
import Link from 'next/link';
import {useId,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {publicHttpsUrl} from '@/lib/sources';

export type EditableTask={id:string;title:string;revision:number;handoff_revision?:number;accepted_result_id?:string|null;next_action?:string;next_action_sources?:string[];next_action_output?:string;expected_output?:string;next_action_progress?:string;next_action_kind?:'contribution'|'review';launch_mission?:boolean|number;relay_leg?:{next_action?:string;source_urls?:string[];useful_progress?:string;max_minutes?:number}};
type Values={next_action:string;sources:string;output:string;progress:string;minutes:string;kind:string;reason:string;feature:boolean};
type Field=Exclude<keyof Values,'feature'>;
type Draft={identity:string;revision:number;handoffRevision:number;values:Values;dirty:boolean;changed:boolean;errors:Partial<Record<Field,string>>;receipt:string;error:string;refreshPending:boolean;uncertain:boolean};
function initial(task:EditableTask):Draft{return {identity:taskIdentity(task),revision:task.revision,handoffRevision:task.handoff_revision||0,values:{next_action:task.next_action||task.relay_leg?.next_action||'',sources:(task.next_action_sources||task.relay_leg?.source_urls||[]).join('\n'),output:task.next_action_output||task.expected_output||'',progress:task.next_action_progress||task.relay_leg?.useful_progress||'',minutes:String(task.relay_leg?.max_minutes||5),kind:task.next_action_kind||'contribution',reason:'',feature:Boolean(task.launch_mission)},dirty:false,changed:false,errors:{},receipt:'',error:'',refreshPending:false,uncertain:false}}
function taskIdentity(task:EditableTask){return JSON.stringify([task.id,task.revision,task.handoff_revision,task.next_action,task.next_action_sources,task.next_action_output,task.expected_output,task.next_action_progress,task.next_action_kind,task.relay_leg,task.launch_mission])}
function validate(values:Values){
 const errors:Partial<Record<Field,string>>={};
 for(const [field,label,max] of [['next_action','Exact unresolved question',1200],['output','Desired output',1200],['progress','Useful progress',1200],['reason','Public reason',1000]] as const){const text=values[field].trim();if(text.length<10||text.length>max)errors[field]=`${label} must contain 10–${max} characters after trimming spaces.`}
 const sources=values.sources.split('\n').map(line=>line.trim()).filter(Boolean);
 if(sources.length>10)errors.sources='Use at most 10 source URLs, one per line.';
 else{const invalid=sources.findIndex(url=>!publicHttpsUrl.safeParse(url).success);if(invalid>=0)errors.sources=`Source ${invalid+1} must be a public HTTPS URL (up to 2,000 characters), on port 443 without credentials, IP addresses, or local names.`}
 const minutes=Number(values.minutes);if(!values.minutes.trim()||!Number.isInteger(minutes)||minutes<1||minutes>5)errors.minutes='Choose a whole number from 1 to 5 minutes.';
 if(!['contribution','review'].includes(values.kind))errors.kind='Choose Contribution or Independent review.';
 return {errors,sources,minutes};
}
export default function HandoffEditor({tasks,selectedTask,selectedTaskId,disabled=false,onSelect,onSaved}:{tasks:EditableTask[];selectedTask:EditableTask|null|undefined;selectedTaskId?:string;disabled?:boolean;onSelect:(id:string)=>void;onSaved:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[drafts,setDrafts]=useState<Record<string,Draft>>({});
 const prefix=useId(),form=useRef<HTMLFormElement>(null),posting=useRef(false),task=selectedTask,selected=selectedTaskId||task?.id||'';
 let draft=task?drafts[task.id]:null;
 // Drafts belong to task IDs, not queue responses or selected-query state.
 // A dirty draft keeps its original revision until the owner compares it.
 if(task&&(!draft||draft.identity!==taskIdentity(task))){const previous=draft;draft=previous?.dirty?{...previous,identity:taskIdentity(task),changed:true}:{...initial(task),receipt:previous?.receipt||'',error:previous?.error||'',refreshPending:previous?.refreshPending||false,uncertain:previous?.uncertain||false};setDrafts(current=>({...current,[task.id]:draft!}))}
 const update=(id:string,change:Partial<Draft>)=>setDrafts(current=>({...current,[id]:{...current[id],...change}}));
 const edit=(field:keyof Values,value:string|boolean)=>{if(!task||!draft)return;update(task.id,{values:{...draft.values,[field]:value},dirty:true,errors:{...draft.errors,[field]:undefined}})};
 async function refreshSaved(id:string){setBusy(true);try{await onSaved();update(id,{refreshPending:false,error:''})}catch(e){update(id,{refreshPending:true,error:'Unable to refresh current records. '+(e instanceof Error?e.message:'Try refresh again.')})}finally{setBusy(false)}}
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!task||!draft||disabled||posting.current||draft.changed||draft.receipt||draft.uncertain)return;
  const {errors,sources,minutes}=validate(draft.values);update(task.id,{errors,error:''});
  if(Object.keys(errors).length){const first=Object.keys(errors)[0];form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();return}
  const id=task.id,values={...draft.values},payload={action:'handoff',task_id:id,next_action:values.next_action.trim(),source_urls:sources,desired_output:values.output.trim(),useful_progress:values.progress.trim(),max_minutes:minutes,kind:values.kind,expected_revision:draft.revision,expected_handoff_revision:draft.handoffRevision,reason:values.reason.trim()};
  posting.current=true;setBusy(true);let confirmed=false,rejected=false;
  try{
   const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});rejected=!r.ok;const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Could not save the next leg.');if(!j.data||typeof j.data!=='object')throw new Error('The save returned an unreadable response.');
   confirmed=true;update(id,{dirty:false,receipt:'Next leg saved. Its previous version remains on the public record.',refreshPending:true});
   if(values.feature){rejected=false;const res=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feature',task_id:id,reason:values.reason.trim()})});rejected=!res.ok;const out=await res.json();if(!res.ok)throw new Error(out.error?.message||'Feature selection failed.');if(!out.data||typeof out.data!=='object')throw new Error('Feature selection returned an unreadable response.')}
  }catch(e){const message=e instanceof Error?e.message:'No confirmation was received.';update(id,{uncertain:!rejected,error:confirmed?`Next leg saved. Feature selection ${rejected?'failed':'has an unknown outcome'}: ${message}`:rejected?message:`The next-leg save outcome is unknown. Inspect the current handoff before another edit. ${message}`,refreshPending:!rejected||confirmed})}
  finally{
   if(confirmed){try{await onSaved();setDrafts(current=>({...current,[id]:{...current[id],refreshPending:false}}))}catch(e){setDrafts(current=>({...current,[id]:{...current[id],refreshPending:true,error:[current[id].error,'The next leg was saved, but current records could not refresh. '+(e instanceof Error?e.message:'Retry refresh.')].filter(Boolean).join(' ')}}))}}
   posting.current=false;setBusy(false);
  }
 }
 const descriptions=(field:Field)=>[field==='sources'?`${prefix}-sources-hint`:null,draft?.errors[field]?`${prefix}-${field}-error`:null].filter(Boolean).join(' ')||undefined;
 const error=(field:Field)=>draft?.errors[field]&&<p id={`${prefix}-${field}-error`} role="alert">{draft.errors[field]}</p>;
 const text=(field:'next_action'|'output'|'progress'|'reason',label:string,max:number)=><div><label htmlFor={`${prefix}-${field}`}>{label}</label><textarea id={`${prefix}-${field}`} name={field} required minLength={10} maxLength={max} value={draft!.values[field]} onChange={e=>edit(field,e.target.value)} aria-invalid={Boolean(draft!.errors[field])} aria-describedby={descriptions(field)}/>{error(field)}</div>;
 const locked=busy||disabled||Boolean(draft?.receipt)||Boolean(draft?.uncertain);
 return <section className="handoff-editor"><h2>Next legs & featured mission</h2><p>Edit the baton being passed, keeping the original brief and acceptance criteria intact.</p><label htmlFor={`${prefix}-task`}>Task</label><select id={`${prefix}-task`} value={selected} disabled={busy} onChange={e=>onSelect(e.target.value)}><option value="">Select a task</option>{task&&!tasks.some(t=>t.id===task.id)&&<option value={task.id}>{task.title} (selected)</option>}{selected&&!tasks.some(t=>t.id===selected)&&task?.id!==selected&&<option value={selected}>Selected task (loading)</option>}{tasks.filter(t=>!t.accepted_result_id).map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select>
 {task&&draft&&<form ref={form} noValidate onSubmit={submit}><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><p><Link href={'/tasks/'+task.id}>Inspect the current public work →</Link> · Revision {task.revision}</p>
 {draft.changed&&<><p role="status">The current handoff changed to revision {task.revision}. Your unsaved draft from revision {draft.revision} is preserved. Compare the current public work before saving.</p><div className="actions"><Button type="button" variant="outline" disabled={busy||disabled} onClick={()=>update(task.id,initial(task))}>Use current handoff</Button><Button type="button" variant="outline" disabled={busy||disabled} onClick={()=>update(task.id,{revision:task.revision,handoffRevision:task.handoff_revision||0,changed:false})}>Keep my draft after reviewing revision {task.revision}</Button></div></>}
 {text('next_action','Exact unresolved question',1200)}
 <div><label htmlFor={`${prefix}-sources`}>Source URLs, one per line</label><textarea id={`${prefix}-sources`} name="sources" value={draft.values.sources} onChange={e=>edit('sources',e.target.value)} aria-invalid={Boolean(draft.errors.sources)} aria-describedby={descriptions('sources')}/><p className="meta" id={`${prefix}-sources-hint`}>One public HTTPS URL per line, up to 10. Spaces around each URL are trimmed.</p>{error('sources')}</div>
 {text('output','Desired output',1200)}{text('progress','Useful progress',1200)}
 <div><label htmlFor={`${prefix}-minutes`}>Contribution limit in minutes (up to 5)</label><input id={`${prefix}-minutes`} type="number" name="minutes" required min={1} max={5} step={1} value={draft.values.minutes} onChange={e=>edit('minutes',e.target.value)} aria-invalid={Boolean(draft.errors.minutes)} aria-describedby={descriptions('minutes')}/>{error('minutes')}</div>
 <div><label htmlFor={`${prefix}-kind`}>Next work type</label><select id={`${prefix}-kind`} name="kind" value={draft.values.kind} onChange={e=>edit('kind',e.target.value)} aria-invalid={Boolean(draft.errors.kind)} aria-describedby={descriptions('kind')}><option value="contribution">Contribution</option><option value="review">Independent review</option></select>{error('kind')}</div>
 {text('reason','Public reason for this edit',1000)}<label className="feature-check"><input type="checkbox" name="feature" checked={draft.values.feature} onChange={e=>edit('feature',e.target.checked)}/> Feature this mission on the task board</label>
 <Button disabled={locked||draft.changed}>{busy?'Saving or refreshing…':draft.receipt?'Next leg saved':'Save next leg'}</Button>
 </fieldset></form>}
 {draft?.receipt&&<p role="status">{draft.receipt}</p>}{draft?.uncertain&&<p role="status">The earlier mutation outcome remains unknown. Inspect the current handoff before starting another edit.</p>}{draft?.error&&<p role="alert">{draft.error}</p>}{task&&draft?.refreshPending&&<Button variant="outline" disabled={busy} onClick={()=>void refreshSaved(task.id)}>Retry refresh</Button>}
 {task&&draft&&(draft.receipt||draft.uncertain)&&!draft.refreshPending&&<Button variant="outline" disabled={busy||disabled} onClick={()=>update(task.id,initial(task))}>{draft.uncertain?'I inspected the current handoff; start a new edit':'Start another edit'}</Button>}
 </section>;
}
