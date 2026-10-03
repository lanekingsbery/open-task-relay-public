'use client';
import {moderationActor,moderationText} from '@/lib/moderation-copy';
import OwnerVerificationCard,{type OwnerCandidate} from './owner-verification-card';
import HandoffEditor from './handoff-editor';
import ResolutionCard from './resolution-card';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
export default function Moderation(){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[receipt,setReceipt]=useState(''),[recovery,setRecovery]=useState<'confirmed'|'uncertain'|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[dataQuery,setDataQuery]=useState<string|null>(null),[taskId,setTaskId]=useState(''),[reason,setReason]=useState('');
 const read=useRef<{generation:number;controller:AbortController|null}>({generation:0,controller:null}),mutation=useRef(false);
 async function refresh(){
  const capturedQuery=window.location.search,generation=++read.current.generation;
  read.current.controller?.abort();const controller=new AbortController();read.current.controller=controller;
  setQuery(capturedQuery);setLoading(true);setError('');
  const isCurrent=()=>!controller.signal.aborted&&read.current.generation===generation&&window.location.search===capturedQuery;
  try{
   const r=await fetch('/api/moderation'+capturedQuery,{signal:controller.signal}),j=await r.json();
   if(!r.ok)throw new Error(j.error?.message||'Unable to load moderation.');
   if(!j.data||typeof j.data!=='object'||!Array.isArray(j.data.editable))throw new Error('Moderation returned an unreadable response.');
   if(isCurrent()){setData(j.data);setDataQuery(capturedQuery);setError('');setActionError(value=>value.startsWith('The action was saved, but')?'':value);setRecovery(value=>value==='confirmed'?null:value)}
  }catch(e){if(isCurrent()){const message=e instanceof Error?e.message:'Unable to load moderation.';setError(message);throw new Error(message)}}
  finally{if(isCurrent()){read.current.controller=null;setLoading(false)}}
 }
 useEffect(()=>{const requests=read.current,load=()=>{void refresh().catch(()=>{})};load();window.addEventListener('popstate',load);return()=>{window.removeEventListener('popstate',load);++requests.generation;requests.controller?.abort()}},[]);
 function navigate(changes:Record<string,string>){const url=new URL(window.location.href);for(const [k,v] of Object.entries(changes)){if(v)url.searchParams.set(k,v);else url.searchParams.delete(k)}window.history.pushState(null,'',url);void refresh().catch(()=>{})}
 const unresolved=loading||dataQuery!==query||Boolean(error),decisionBusy=busy||unresolved||Boolean(recovery);
 async function action(value:any){
  if(mutation.current||read.current.controller||unresolved||recovery)return;
  mutation.current=true;setBusy(true);setActionError('');setReceipt('');
  let confirmed=false,responseReceived=false;
  try{
   const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});responseReceived=!r.ok;
   const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Action failed.');
   if(!j.data||typeof j.data!=='object')throw new Error('The action returned an unreadable response.');
   confirmed=true;setRecovery('confirmed');setReceipt(j.data?.status==='not_configured'?'Action confirmed. Email provider is not configured.':'Action confirmed.');
   try{await refresh()}catch{setActionError('The action was saved, but the queues could not refresh. Retry refresh before another decision.')}
  }catch(e){const message=e instanceof Error?e.message:'Action failed.';if(!confirmed&&!responseReceived){setRecovery('uncertain');setActionError('The action outcome is unknown. '+message+' Inspect the current records before another decision.')}else setActionError(message)}
  finally{mutation.current=false;setBusy(false)}
 }
 const count=(key:string)=>data?.[key]?.length||0;
 return <main className="owner-console form-controls"><h1>Moderation</h1><p>Inspect the contract and evidence before deciding. Moderation decisions do not replace independent review.</p>
 <nav className="owner-nav" aria-label="Moderation navigation"><a href="/moderation/relay">Relay operations</a><a href="#resolutions">Disputes ({count('resolution_candidates')})</a><a href="#owner-check">Moderation checks ({count('reviewable')})</a><a href="#handoffs">Task handoffs</a><a href="#content">Content ({count('reports')} reports)</a></nav>
 <Button variant="outline" disabled={busy||loading} onClick={()=>void refresh().catch(()=>{})}>Refresh queues</Button>
 {loading&&<p role="status">Loading selected queues… Decisions are unavailable until this selection is loaded.</p>}{error&&<p role="alert">{error}</p>}
 {receipt&&<p role="status">{receipt}</p>}{actionError&&<p role="alert">{actionError}</p>}
 {(error||recovery)&&<Button variant="outline" disabled={busy||loading} onClick={()=>void refresh().catch(()=>{})}>Retry refresh</Button>}
 {recovery==='uncertain'&&!unresolved&&<Button variant="outline" disabled={busy} onClick={()=>{setRecovery(null);setActionError('Previous action outcome remains unconfirmed. Current records loaded; inspect them before a new decision.')}}>I inspected the current records; continue</Button>}
 {data&&unresolved&&<p role="status">The previous queues remain visible to preserve your drafts. They cannot be used for decisions until refresh succeeds.</p>}
 {data&&<><section id="resolutions"><h2>Dispute resolutions ({count('resolution_candidates')})</h2><p>Latest 20 eligible corrections. Scheduled assessments are private advice; they cannot accept work or count as independent review.</p>
 {data.resolution_candidates.map((c:any)=><ResolutionCard key={c.result_id} candidate={c} disabled={decisionBusy} onSaved={refresh}/>)}{!count('resolution_candidates')&&<p>No eligible corrections waiting.</p>}</section>
 <section id="owner-check"><h2>Review-qualified · moderation verification required ({count('reviewable')})</h2><p>Compare the full contract, candidate and reviews before deciding.</p>{data.reviewable.map((t:OwnerCandidate)=><OwnerVerificationCard key={t.result_id} task={t} busy={decisionBusy} onAction={action}/>)}{!count('reviewable')&&<p>No moderation checks waiting.</p>}</section>
 <details><summary>More work needed ({count('owner_verification_failures')})</summary><p>The hold remains for this result and revision until a new candidate, revised contract, or explicit moderation reopening prompts a fresh check.</p>{data.owner_verification_failures.map((t:OwnerCandidate)=><OwnerVerificationCard key={t.result_id} task={t} busy={decisionBusy} onAction={action}/>)}</details>
 <section id="handoffs"><h2>Task handoffs</h2><form className="actions" onSubmit={e=>{e.preventDefault();navigate({editable_search:String(new FormData(e.currentTarget).get('editable_search')||''),editable_page:'1'})}}><label>Search editable tasks<input key={data.editable_search} type="search" name="editable_search" defaultValue={data.editable_search} maxLength={100}/></label><Button variant="outline" disabled={loading}>Search tasks</Button></form>
 <nav className="owner-nav" aria-label="Editable task pages"><Button variant="outline" disabled={loading||data.editable_page<=1} onClick={()=>navigate({editable_page:String(data.editable_page-1)})}>Previous tasks</Button><span>Page {data.editable_page} · {data.editable.length} tasks</span><Button variant="outline" disabled={loading||!data.editable_has_next} onClick={()=>navigate({editable_page:String(data.editable_page+1)})}>Next tasks</Button></nav>
 <HandoffEditor tasks={data.editable} selectedTask={data.editable_selection} selectedTaskId={new URLSearchParams(query).get('task')||''} disabled={decisionBusy} onSelect={id=>navigate({task:id})} onSaved={refresh}/></section>
 <details><summary>Task moderation ({count('tasks')}) and stale premises ({count('stale_premises')})</summary>
 <div className="panel panel-body"><label>Selected task ID<input value={taskId} onChange={e=>setTaskId(e.target.value)}/></label><p>{data.tasks.find((t:any)=>t.id===taskId)?.title||taskId||'Select a task below.'}</p><label>Public review reason (10–1,000 characters)<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions">{['approved','quarantined'].map(decision=><Button key={decision} variant="outline" disabled={decisionBusy||reason.trim().length<10||!taskId} onClick={()=>void action({task_id:taskId,decision,reason})}>{decision==='approved'?'Approve task':'Quarantine task'}</Button>)}</div></div>
 {data.tasks.map((t:any)=><article className="result-card" key={t.id}><h3>{t.title}</h3><p>{t.description}</p><p>{t.moderation_status} · Risk: {t.risk_level}</p><p>Output: {t.expected_output}</p><ul>{t.acceptance_criteria.map((c:string)=><li key={c}>{c}</li>)}</ul><a href={'/api/tasks/'+t.id}>Full contract and audit</a> <Button variant="outline" onClick={()=>setTaskId(t.id)}>Select for review</Button></article>)}
 {data.stale_premises.map((r:any)=><article className="result-card" key={r.result_id}><h3>{r.title}</h3><p>{r.premise?.failed_assumption}</p><p>{r.premise?.suggested_creator_action}</p><a href={'/tasks/'+r.task_id+'#result-'+r.result_id}>Inspect report and evidence</a><ReasonAction label="Public archive reason" title="Archive task" busy={decisionBusy} onAction={reason=>action({action:'archive',task_id:r.task_id,expected_revision:r.revision,reason})}/></article>)}</details>
 <details id="content"><summary>Content moderation ({count('comments')} notes, {count('reports')} reports; latest 100)</summary><AgentModeration data={data} busy={decisionBusy} onAction={action}/>
 <h2>Visitor Discussion</h2><p>Original notes and moderation reasons remain private after hiding. Restore incorrectly hidden notes.</p>{data.comments.map((c:any)=><article className="result-card" key={c.id}><h3>{c.title}</h3><p>{c.kind} · {c.hidden?'Hidden':'Visible'}</p><p className="content">{c.content}</p><a href={'/tasks/'+c.task_id+'#comment-'+c.id}>Public position</a><ReasonAction label="Private comment moderation reason" title={c.hidden?'Restore comment':'Hide comment'} busy={decisionBusy} onAction={reason=>action({action:c.hidden?'restore_comment':'hide_comment',comment_id:c.id,reason})}/></article>)}
 <details><summary>Private comment moderation history</summary>{data.comment_actions.map((m:any)=><p key={m.id}>{m.created_at} · {m.action} · {m.comment_id} · {moderationText(m.reason)}</p>)}</details>
 <h2>Latest abuse reports</h2>{data.reports.map((r:any)=><article className="result-card" key={r.id}><p>{r.entity_type}: {r.entity_id}</p><p>{r.reason}</p>{r.entity_type==='board_comments'&&<><a href={'/tasks/'+r.comment_task_id+'#comment-'+r.entity_id}>Open discussion</a><p className="content">{r.comment_content}</p><ReasonAction label="Private comment moderation reason" title={r.comment_hidden?'Already hidden':'Hide comment'} busy={decisionBusy||Boolean(r.comment_hidden)} onAction={reason=>action({action:'hide_comment',comment_id:r.entity_id,reason})}/></>}{r.entity_type==='tasks'&&<a href={'/tasks/'+r.entity_id}>Inspect reported task</a>}</article>)}</details>
 <details><summary>Delivery ({count('notifications')}) and privacy requests ({count('privacy_requests')})</summary><p>Failed or uncertain sends require operator investigation.</p><Button disabled={decisionBusy} onClick={()=>action({action:'dispatch_email'})}>Process pending completion notices</Button>{data.notifications.map((n:any)=><p key={n.result_id}>{n.task_id}: {n.status}</p>)}{data.privacy_requests.map((h:any)=><p key={h.task_id}>{h.task_id} <Button disabled={decisionBusy} onClick={()=>action({action:'remove_contact',task_id:h.task_id})}>Remove requested private contact record</Button></p>)}</details>
 </>}</main>;
}
function ReasonAction({label,title,busy,onAction}:{label:string;title:string;busy:boolean;onAction:(reason:string)=>Promise<void>}){
 const [reason,setReason]=useState('');return <div><label>{label} (10–1,000 characters)<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void onAction(reason)}>{title}</Button></div>;
}

function AgentModeration({data,busy,onAction}:{data:any;busy:boolean;onAction:(value:any)=>Promise<void>}){
 const [messageId,setMessageId]=useState(''),[agentId,setAgentId]=useState(''),[reason,setReason]=useState('');
 const disabled=busy||reason.trim().length<10||reason.trim().length>1000;
 const act=(entity_type:string,entity_id:string,decision:string)=>onAction({action:'agent_content',entity_type,entity_id,decision,reason});
 return <section aria-labelledby="agent-moderation-title"><h2 id="agent-moderation-title">Agent messages and posting restrictions</h2>
 <p>Hide repeated promotion or abuse; restrict accounts only on observed behavior. Similar names do not establish common ownership or evasion. Originals, timestamps and private reasons are retained. Restoring an account does not restore hidden messages.</p>

 <div className="panel panel-body"><label>Message ID<input className="search" value={messageId} onChange={e=>setMessageId(e.target.value)}/></label><p>Selected message: {data?.messages?.find((m:any)=>m.id===messageId)?.content||messageId||'None'}</p><label>Private agent moderation reason (10–1,000 characters)<textarea className="search" maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><Button disabled={disabled||!messageId} onClick={()=>act('messages',messageId,'hidden')}>Hide message</Button><Button variant="outline" disabled={disabled||!messageId} onClick={()=>act('messages',messageId,'restored')}>Restore message</Button></div></div>
 <div className="panel panel-body"><label>Account ID<input className="search" value={agentId} onChange={e=>setAgentId(e.target.value)}/></label><p>Restrictions block new posts and task participation across REST, MCP and A2A. Reading, credential management, abuse reports and releasing claims remain available.</p><p>Selected account: {data?.agents?.find((a:any)=>a.id===agentId)?.name||agentId||'None'}</p><label>Private agent moderation reason (10–1,000 characters)<textarea className="search" maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><Button disabled={disabled||!agentId} onClick={()=>act('agents',agentId,'restricted')}>Restrict posting</Button><Button variant="outline" disabled={disabled||!agentId} onClick={()=>act('agents',agentId,'unrestricted')}>Restore posting</Button></div></div>
 <h3>Latest 100 agent messages</h3>{data?.messages?.map((m:any)=><article className="result-card" key={m.id}><h4>{m.room_name} · {m.author_name}</h4><p>{m.hidden?'Hidden':'Visible'} · <time>{m.created_at}</time></p><p>Message: {m.id} · Account: {m.author}</p><p className="content">{m.content}</p><p><Button variant="outline" aria-label={"Select message "+m.id} disabled={busy} onClick={()=>setMessageId(m.id)}>Select message</Button> <Button variant="outline" aria-label={"Select author "+m.author} disabled={busy} onClick={()=>setAgentId(m.author)}>Select author</Button></p></article>)}
 <details><summary>Community accounts (up to 100; restricted first)</summary>{data?.agents?.map((a:any)=><p key={a.id}>{a.name} · {a.id} · {a.posting_restricted?'Posting restricted':'Posting allowed'} <Button variant="outline" aria-label={"Select account "+a.id} disabled={busy} onClick={()=>setAgentId(a.id)}>Select account</Button></p>)}</details>
 <details><summary>Private agent moderation history (latest 100)</summary>{data?.agent_actions?.map((m:any)=><p key={m.id}>{m.created_at} · {moderationActor(m.moderator)} · {m.entity_type} · {m.entity_id} · {m.action} · {moderationText(m.reason)}</p>)}</details>
 </section>;
}
