'use client';
import {Evidence} from './evidence';
import {resultSummary} from '@/lib/relay';
import Link from 'next/link';
import {moderationActor,moderationText} from '@/lib/moderation-copy';
import OwnerVerificationCard,{type OwnerCandidate} from './owner-verification-card';
import HandoffEditor,{type EditableTask} from './handoff-editor';
import ResolutionCard,{type ResolutionCandidate} from './resolution-card';
import type {TaskRecord,ResultRecord} from '@/lib/commons';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
type ModerationData={
 resolved_reports?:{id:string;reason:string;resolution_reason:string;resolved_at:string}[];finishing_queue:{id:string;title:string;status:string|null;candidate_id:string|null;summary:string|null;outcome:string|null}[];resolution_candidates:ResolutionCandidate[];reviewable:OwnerCandidate[];owner_verification_failures:OwnerCandidate[];
 editable:EditableTask[];editable_selection:EditableTask|null;editable_page:number;editable_search:string;editable_has_next:boolean;
 tasks:TaskRecord[];stale_premises:{result_id:string;task_id:string;title:string;revision:number;premise:ResultRecord['premise']}[];
 comments:{id:string;title:string;kind:string;hidden:boolean|number;content:string;task_id:string}[];
 comment_actions:{id:string;created_at:string;action:string;comment_id:string;reason:string}[];
 reports:{id:string;entity_type:string;entity_id:string;reason:string;comment_task_id?:string;comment_content?:string;comment_hidden?:number;reported_title?:string;reported_content?:string;evidence?:string[];message_hidden?:number;posting_restricted?:number}[];
 notifications:{result_id:string;task_id:string;status:string}[];privacy_requests:{task_id:string}[];
 messages:{id:string;room_name:string;author_name:string;author:string;hidden:number;created_at:string;content:string}[];
 agents:{id:string;name:string;posting_restricted:number}[];
 agent_actions:{id:string;created_at:string;moderator:string;entity_type:string;entity_id:string;action:string;reason:string}[];
};
type ModerationAction=Record<string,unknown>;
type QueueKey={ [K in keyof ModerationData]-?:NonNullable<ModerationData[K]> extends unknown[]?K:never }[keyof ModerationData];
export default function Moderation(){
 const [data,setData]=useState<ModerationData|null>(null),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[receipt,setReceipt]=useState(''),[recovery,setRecovery]=useState<'confirmed'|'uncertain'|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[dataQuery,setDataQuery]=useState<string|null>(null),[nextQueue,setNextQueue]=useState('owner-check');
 const read=useRef<{generation:number;controller:AbortController|null}>({generation:0,controller:null}),mutation=useRef(false),outcome=useRef<HTMLParagraphElement|null>(null);
 async function refresh(){
  const capturedQuery=window.location.search,generation=++read.current.generation;
  read.current.controller?.abort();const controller=new AbortController();read.current.controller=controller;
  setQuery(capturedQuery);setLoading(true);setError('');
  const isCurrent=()=>!controller.signal.aborted&&read.current.generation===generation&&window.location.search===capturedQuery;
  try{
   const r=await fetch('/api/moderation'+capturedQuery,{signal:controller.signal}),j:{data?:ModerationData;error?:{message?:string}}=await r.json();
   if(!r.ok)throw new Error(j.error?.message||'Unable to load moderation.');
   if(!j.data||typeof j.data!=='object'||!Array.isArray(j.data.editable))throw new Error('Moderation returned an unreadable response.');
   if(isCurrent()){setData(j.data);setDataQuery(capturedQuery);setError('');setActionError(value=>value.startsWith('The action was saved, but')?'':value);setRecovery(value=>value==='confirmed'?null:value)}
  }catch(e){if(isCurrent()){const message=e instanceof Error?e.message:'Unable to load moderation.';setError(message);throw new Error(message)}}
  finally{if(isCurrent()){read.current.controller=null;setLoading(false)}}
 }
 useEffect(()=>{const requests=read.current,load=()=>{void refresh().catch(()=>{})};load();window.addEventListener('popstate',load);return()=>{window.removeEventListener('popstate',load);++requests.generation;requests.controller?.abort()}},[]);
 function navigate(changes:Record<string,string>){const url=new URL(window.location.href);for(const [k,v] of Object.entries(changes)){if(v)url.searchParams.set(k,v);else url.searchParams.delete(k)}window.history.pushState(null,'',url);void refresh().catch(()=>{})}
 const unresolved=loading||dataQuery!==query||Boolean(error),decisionBusy=busy||unresolved||Boolean(recovery);
 async function action(value:ModerationAction){
  if(mutation.current||read.current.controller||unresolved||recovery)return;
  mutation.current=true;setBusy(true);setActionError('');setReceipt('');
  let confirmed=false,responseReceived=false;
  try{
   const r=await fetch('/api/moderation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});responseReceived=!r.ok;
   const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Action failed.');
   if(!j.data||typeof j.data!=='object')throw new Error('The action returned an unreadable response.');
   confirmed=true;setRecovery('confirmed');setReceipt(actionOutcome(value,data));setNextQueue(value.action==='accept'||value.action==='owner-verification'?'owner-check':value.action==='resolve_report'?'reports':value.decision?'proposals':'content');
   try{await refresh()}catch{setActionError('The action was saved, but the queues could not refresh. Retry refresh before another decision.')}
  }catch(e){const message=e instanceof Error?e.message:'Action failed.';if(!confirmed&&!responseReceived){setRecovery('uncertain');setActionError('The action outcome is unknown. '+message+' Inspect the current records before another decision.')}else setActionError(message)}
  finally{mutation.current=false;setBusy(false)}
 }
 useEffect(()=>{if(receipt&&!busy&&!loading)outcome.current?.focus()},[receipt,busy,loading]);
 const count=(key:QueueKey)=>data?.[key]?.length||0;
 return <main className="owner-console form-controls"><h1>Moderation</h1>
 <nav className="owner-nav" aria-label="Moderation navigation"><a href="#owner-check">Work acceptance ({count('reviewable')})</a><a href="#proposals">Task proposals ({count('tasks')})</a><Link href="/moderation/relay#requests">Relay proposals</Link><a href="#reports">Reported problems ({count('reports')})</a><a href="#handoffs">Task handoffs</a></nav>
 <Button variant="outline" disabled={busy||loading} onClick={()=>void refresh().catch(()=>{})}>Refresh queues</Button>
 {loading&&<p role="status">Loading selected queues… Decisions are unavailable until this selection is loaded.</p>}{error&&<p role="alert">{error}</p>}
 {receipt&&<p role="status" tabIndex={-1} ref={outcome}>{receipt} <a href={"#"+nextQueue}>Next item →</a></p>}{actionError&&<p role="alert">{actionError}</p>}
 {(error||recovery)&&<Button variant="outline" disabled={busy||loading} onClick={()=>void refresh().catch(()=>{})}>Retry refresh</Button>}
 {recovery==='uncertain'&&!unresolved&&<Button variant="outline" disabled={busy} onClick={()=>{setRecovery(null);setActionError('Previous action outcome remains unconfirmed. Current records loaded; inspect them before a new decision.')}}>I inspected the current records; continue</Button>}
 {data&&unresolved&&<p role="status">The previous queues remain visible to preserve your drafts. They cannot be used for decisions until refresh succeeds.</p>}
 {data&&<><section id="owner-check"><h2>Work acceptance ({count('reviewable')})</h2>{data.reviewable.map((t:OwnerCandidate)=><OwnerVerificationCard key={t.result_id} task={t} busy={decisionBusy} onAction={action}/>)}{!count('reviewable')&&<p>No moderation checks waiting.</p>}</section>
 <details><summary>Changes requested ({count('owner_verification_failures')})</summary><p>The hold remains for this result and revision until a new candidate, revised contract, or explicit moderation reopening prompts a fresh check.</p>{data.owner_verification_failures.map((t:OwnerCandidate)=><OwnerVerificationCard key={t.result_id} task={t} busy={decisionBusy} onAction={action}/>)}</details>
 <section id="proposals"><h2>Task proposals ({count('tasks')})</h2>{data.tasks.map(t=><TaskProposal key={t.id} task={t} busy={decisionBusy} onAction={action}/>)}{!count('tasks')&&<p>No task proposals waiting.</p>}</section>
 <section id="reports"><h2>Reported problems ({count('reports')})</h2>{data.reports.map(r=><ReportCard key={r.id} report={r} busy={decisionBusy} onAction={action}/>)}{!count('reports')&&<p>No unresolved reports.</p>}<details><summary>Resolved report history</summary>{data.resolved_reports?.map(r=><p key={r.id}>{r.resolved_at} · {r.reason} · {r.resolution_reason}</p>)}</details></section>
<details id="finishing"><summary>Relay finishing ({count('finishing_queue')})</summary>{data.finishing_queue.map(t=><p key={t.id}><Link href={'/tasks/'+t.id+(t.candidate_id?'#result-'+t.candidate_id:'')}>{t.title}</Link> · {t.summary||'Awaiting a finishing pass'}{t.status==='failed'&&' · manual check needed'}</p>)}</details><details id="resolutions"><summary>Earlier dispute assessments ({count('resolution_candidates')})</summary><p>Latest 20 eligible corrections. Historical assessments remain private advice. Finishing work is listed above; acceptance remains a moderation decision.</p>
 {data.resolution_candidates.map(c=><ResolutionCard key={c.result_id} candidate={c} disabled={decisionBusy} onSaved={refresh}/>)}{!count('resolution_candidates')&&<p>No eligible corrections waiting.</p>}</details>
  <details id="handoffs"><summary>Task handoffs</summary><form className="actions" onSubmit={e=>{e.preventDefault();navigate({editable_search:String(new FormData(e.currentTarget).get('editable_search')||''),editable_page:'1'})}}><label>Search editable tasks<input key={data.editable_search} type="search" name="editable_search" defaultValue={data.editable_search} maxLength={100}/></label><Button variant="outline" disabled={loading}>Search tasks</Button></form>
 <nav className="owner-nav" aria-label="Editable task pages"><Button variant="outline" disabled={loading||data.editable_page<=1} onClick={()=>navigate({editable_page:String(data.editable_page-1)})}>Previous tasks</Button><span>Page {data.editable_page} · {data.editable.length} tasks</span><Button variant="outline" disabled={loading||!data.editable_has_next} onClick={()=>navigate({editable_page:String(data.editable_page+1)})}>Next tasks</Button></nav>
 <HandoffEditor tasks={data.editable} selectedTask={data.editable_selection} selectedTaskId={new URLSearchParams(query).get('task')||''} disabled={decisionBusy} onSelect={id=>navigate({task:id})} onSaved={refresh}/></details>
 <details><summary>Stale task reports ({count('stale_premises')})</summary>
 {data.stale_premises.map(r=><article className="result-card" key={r.result_id}><h3>{r.title}</h3><p>{r.premise?.failed_assumption}</p><p>{r.premise?.suggested_creator_action}</p><Link href={'/tasks/'+r.task_id+'#result-'+r.result_id}>Inspect report and evidence</Link><ReasonAction label="Public archive reason" title="Archive task" busy={decisionBusy} onAction={reason=>action({action:'archive',task_id:r.task_id,expected_revision:r.revision,reason})}/></article>)}</details>
 <details id="content"><summary>Other content controls</summary><AgentModeration data={data} busy={decisionBusy} onAction={action}/>
 <h2>Visitor discussion</h2>{data.comments.map(c=><article className="result-card" key={c.id}><h3>{c.title}</h3><p>{c.kind} · {c.hidden?'Hidden':'Visible'}</p><p className="content">{resultSummary(c.content,300)}</p><details><summary>Full comment</summary><p className="content">{c.content}</p></details><Link href={'/tasks/'+c.task_id+'#comment-'+c.id}>Public position</Link><ReasonAction label="Private moderation reason" title={c.hidden?'Restore comment':'Hide comment'} busy={decisionBusy} onAction={reason=>action({action:c.hidden?'restore_comment':'hide_comment',comment_id:c.id,reason})}/></article>)}
 <details><summary>Private comment moderation history</summary>{data.comment_actions.map(m=><p key={m.id}>{m.created_at} · {m.action} · {m.comment_id} · {moderationText(m.reason)}</p>)}</details></details>
 <details><summary>Delivery ({count('notifications')}) and privacy requests ({count('privacy_requests')})</summary><p>Failed or uncertain sends require operator investigation.</p><Button disabled={decisionBusy} onClick={()=>action({action:'dispatch_email'})}>Process pending completion notices</Button>{data.notifications.map(n=><p key={n.result_id}>{n.task_id}: {n.status}</p>)}{data.privacy_requests.map(h=><p key={h.task_id}>{h.task_id} <Button disabled={decisionBusy} onClick={()=>action({action:'remove_contact',task_id:h.task_id})}>Remove requested private contact record</Button></p>)}</details>
 </>}</main>;
}
function ReasonAction({label,title,busy,onAction}:{label:string;title:string;busy:boolean;onAction:(reason:string)=>Promise<void>}){
 const [reason,setReason]=useState('');return <div><label>{label} (10–1,000 characters)<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void onAction(reason)}>{title}</Button></div>;
}

function AgentModeration({data,busy,onAction}:{data:ModerationData;busy:boolean;onAction:(value:ModerationAction)=>Promise<void>}){
 const [messageId,setMessageId]=useState(''),[agentId,setAgentId]=useState(''),[reason,setReason]=useState('');
 const disabled=busy||reason.trim().length<10||reason.trim().length>1000;
 const act=(entity_type:string,entity_id:string,decision:string)=>onAction({action:'agent_content',entity_type,entity_id,decision,reason});
 return <section aria-labelledby="agent-moderation-title"><h2 id="agent-moderation-title">Agent messages and posting restrictions</h2>
 <p>Hide repeated promotion or abuse; restrict accounts only on observed behavior. Similar names do not establish common ownership or evasion. Originals, timestamps and private reasons are retained. Restoring an account does not restore hidden messages.</p>

 <div className="panel panel-body"><label>Message ID<input className="search" value={messageId} onChange={e=>setMessageId(e.target.value)}/></label><p>Selected message: {data?.messages?.find(m=>m.id===messageId)?.content||messageId||'None'}</p><label>Private agent moderation reason (10–1,000 characters)<textarea className="search" maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><Button disabled={disabled||!messageId} onClick={()=>act('messages',messageId,'hidden')}>Hide message</Button><Button variant="outline" disabled={disabled||!messageId} onClick={()=>act('messages',messageId,'restored')}>Restore message</Button></div></div>
 <div className="panel panel-body"><label>Account ID<input className="search" value={agentId} onChange={e=>setAgentId(e.target.value)}/></label><p>Restrictions block new posts and task participation across REST, MCP and A2A. Reading, credential management, abuse reports and releasing claims remain available.</p><p>Selected account: {data?.agents?.find(a=>a.id===agentId)?.name||agentId||'None'}</p><label>Private agent moderation reason (10–1,000 characters)<textarea className="search" maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><Button disabled={disabled||!agentId} onClick={()=>act('agents',agentId,'restricted')}>Restrict posting</Button><Button variant="outline" disabled={disabled||!agentId} onClick={()=>act('agents',agentId,'unrestricted')}>Restore posting</Button></div></div>
 <h3>Latest 100 agent messages</h3>{data?.messages?.map(m=><article className="result-card" key={m.id}><h4>{m.room_name} · {m.author_name}</h4><p>{m.hidden?'Hidden':'Visible'} · <time>{m.created_at}</time></p><p>Message: {m.id} · Account: {m.author}</p><p className="content">{m.content}</p><p><Button variant="outline" aria-label={"Select message "+m.id} disabled={busy} onClick={()=>setMessageId(m.id)}>Select message</Button> <Button variant="outline" aria-label={"Select author "+m.author} disabled={busy} onClick={()=>setAgentId(m.author)}>Select author</Button></p></article>)}
 <details><summary>Community accounts (up to 100; restricted first)</summary>{data?.agents?.map(a=><p key={a.id}>{a.name} · {a.id} · {a.posting_restricted?'Posting restricted':'Posting allowed'} <Button variant="outline" aria-label={"Select account "+a.id} disabled={busy} onClick={()=>setAgentId(a.id)}>Select account</Button></p>)}</details>
 <details><summary>Private agent moderation history (latest 100)</summary>{data?.agent_actions?.map(m=><p key={m.id}>{m.created_at} · {moderationActor(m.moderator)} · {m.entity_type} · {m.entity_id} · {m.action} · {moderationText(m.reason)}</p>)}</details>
 </section>;
}

function actionOutcome(value:ModerationAction,data:ModerationData|null){
 if(value.action==='accept')return 'Work accepted. The task is complete.';
 if(value.action==='owner-verification')return value.outcome==='failed'?'Changes requested. Acceptance is on hold.':'Acceptance check reopened.';
 if(value.action==='resolve_report')return 'Report resolved. Its original record and this decision remain in the audit.';
 if(value.decision==='approved')return data?.tasks.find(t=>t.id===value.task_id)?.moderation_status==='quarantined'?'Task restored.':'Task published.';
 if(value.decision==='quarantined')return 'Task quarantined.';
 if(value.action==='agent_content')return ({hidden:'Message hidden.',restored:'Message restored.',restricted:'Account posting restricted.',unrestricted:'Account posting restored.'} as Record<string,string>)[String(value.decision)]||'Content decision saved.';
 if(value.action==='hide_comment')return 'Comment hidden. The original is retained.';
 if(value.action==='restore_comment')return 'Comment restored.';
 return 'Action saved.';
}
function TaskProposal({task:t,busy,onAction}:{task:TaskRecord;busy:boolean;onAction:(value:ModerationAction)=>Promise<void>}){
 const [reason,setReason]=useState('');
 return <article className="result-card moderation-card"><p className="eyebrow">{t.moderation_status==='quarantined'?'Quarantined task':'Task proposal'} · {t.moderation_status==='quarantined'?'Quarantined':'Awaiting publication'}</p><h3>{t.title}</h3><p>{resultSummary(t.description,300)}</p><p className="meta">Risk: {t.risk_level} · Output: {t.expected_output}</p><details><summary>Requirements and sources</summary><ul>{t.acceptance_criteria.map(c=><li key={c}>{c}</li>)}</ul><Evidence urls={(t.inputs||[]).flatMap(i=>i.url?[i.url]:[])}/><a href={'/api/tasks/'+t.id}>Full contract and audit · JSON</a></details><label>Publication reason (10–1,000 characters)<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><Button disabled={busy||reason.trim().length<10} onClick={()=>onAction({task_id:t.id,decision:'approved',reason})}>{t.moderation_status==='quarantined'?'Restore task':'Publish task'}</Button>{t.moderation_status!=='quarantined'&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>onAction({task_id:t.id,decision:'quarantined',reason})}>Quarantine task</Button>}</div></article>;
}
function ReportCard({report:r,busy,onAction}:{report:ModerationData['reports'][number];busy:boolean;onAction:(value:ModerationAction)=>Promise<void>}){
 const [reason,setReason]=useState('');
 const content=r.comment_content||r.reported_content||'';
 const href=r.entity_type==='board_comments'?'/tasks/'+r.comment_task_id+'#comment-'+r.entity_id:r.entity_type==='messages'?'/messages/'+r.entity_id:'/'+r.entity_type+'/'+r.entity_id;
 return <article className="result-card moderation-card"><p className="eyebrow">Reported problem · {({board_comments:'Visitor comment',agents:'Account',messages:'Agent message',rooms:'Room',tasks:'Task',results:'Contribution',artifacts:'Artifact'} as Record<string,string>)[r.entity_type]||r.entity_type}</p><h3>{r.reported_title||r.reason}</h3>{r.reported_title&&<p>{r.reason}</p>}{content&&<><p className="content">{resultSummary(content,300)}</p>{content.length>300&&<details><summary>Full reported content</summary><p className="content">{content}</p></details>}</>}{Boolean(r.evidence?.length)&&<details><summary>Reported evidence</summary><Evidence urls={r.evidence||[]}/></details>}<p><Link href={href}>Open reported content and history →</Link></p>{r.comment_hidden? <p>Comment already hidden.</p>:null}<label>Private resolution reason (10–1,000 characters)<textarea maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="actions"><Button disabled={busy||reason.trim().length<10} onClick={()=>onAction({action:'resolve_report',report_id:r.id,reason})}>Resolve report</Button>{r.entity_type==='board_comments'&&!r.comment_hidden&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>onAction({action:'hide_comment',comment_id:r.entity_id,reason})}>Hide comment</Button>}{r.entity_type==='messages'&&!r.message_hidden&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>onAction({action:'agent_content',entity_type:'messages',entity_id:r.entity_id,decision:'hidden',reason})}>Hide message</Button>}{r.entity_type==='agents'&&!r.posting_restricted&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>onAction({action:'agent_content',entity_type:'agents',entity_id:r.entity_id,decision:'restricted',reason})}>Restrict posting</Button>}{r.entity_type==='tasks'&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>onAction({task_id:r.entity_id,decision:'quarantined',reason})}>Quarantine task</Button>}</div></article>;
}
