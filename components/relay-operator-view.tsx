'use client';
import Link from 'next/link';
import {auditRuleLabel,moderationText,receiptPresentation} from '@/lib/moderation-copy';
import {externalLinkProps} from "@/lib/external-links";

import {useCallback,useEffect,useRef,useState} from 'react';
import {ownerDecisionAttempt,sendOwnerDecision,OwnerDecisionError} from '@/lib/owner-decision-client';
type RequestRow={assessment_json:string|null;id:string;status:string;reason:string;draft_json:string|null;draft_hash:string|null;revision:number;input_json:string;task_id:string|null;created_at:number};
type View={offset:number;next_offset:number|null;control:{enabled:number;revision:number};source_version:string;requests:RequestRow[];
 followups:{id:string;target_id:string;reason:string;status:string}[];
 receipts:{id:string;action_key:string;policy_rule:string;reason:string;source_version:string;target_id:string;created_at:number;actor:string}[];
 health:{observed_at:number}|null;limits:unknown};
const object=(value:unknown):Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:{};
const parseJson=(value:string|null):unknown=>{try{return JSON.parse(value||'{}')}catch{return {}}};
const parse=(value:string|null)=>object(parseJson(value));
export default function RelayOperatorView(){
 const [view,setView]=useState<View|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
 const [pending,setPending]=useState<ReturnType<typeof ownerDecisionAttempt>|null>(null),inFlight=useRef(false);
 const reads=useRef<{generation:number;controller:AbortController|null}>({generation:0,controller:null});
 const reload=useCallback((offset?:number)=>{
  const requestedUrl=window.location.href,url=new URL(requestedUrl),raw=Number(url.searchParams.get('offset')||0);
  const page=offset??(Number.isInteger(raw)?Math.min(2000,Math.max(0,raw)):0);
  const generation=++reads.current.generation;
  reads.current.controller?.abort();const controller=new AbortController();reads.current.controller=controller;
  const isCurrent=()=>!controller.signal.aborted&&reads.current.generation===generation&&window.location.href===requestedUrl;
  return fetch('/api/moderation/relay?offset='+page,{signal:controller.signal}).then(async response=>{
   const json:{data?:View;error?:{message?:string}}=await response.json();
   if(!response.ok)throw new Error(json.error?.message||'Unable to load');
   if(!json.data)throw new Error('Relay operations returned an unreadable response.');
   if(isCurrent()){setView(json.data);setError('');url.searchParams.set('offset',String(page));window.history.replaceState(null,'',url)}
  }).catch(error=>{if(isCurrent())setError(error instanceof Error?error.message:'Unable to load')})
   .finally(()=>{if(!controller.signal.aborted&&reads.current.generation===generation){reads.current.controller=null;setLoading(false)}});
 },[]);
 // Initial loading is already true. Event-triggered refreshes set it explicitly.
 useEffect(()=>{void reload();const current=reads.current;return()=>{++current.generation;current.controller?.abort()}},[reload]);
 async function refresh(offset?:number){setLoading(true);await reload(offset)}
 async function decide(input?:Record<string,unknown>){
  if(inFlight.current)return;
  const attempt=pending||ownerDecisionAttempt(input!);inFlight.current=true;setBusy(true);setPending(attempt);setError('');setNotice('');
  try{await sendOwnerDecision(attempt);setPending(null);setNotice('Decision confirmed.');await refresh()}
  catch(e){if(e instanceof OwnerDecisionError&&!e.uncertain)setPending(null);setError(e instanceof Error?e.message:'Unable to confirm decision.')}
  finally{inFlight.current=false;setBusy(false)}
 }
 const disabled=busy||Boolean(pending)||loading;
 return <main className="owner-console form-controls"><h1>Relay operations</h1><p>Review sources, scope, duplicates, and public benefit. Preparing a draft and confirming its publication are separate moderation decisions.</p>
 <nav className="owner-nav" aria-label="Moderation navigation"><Link href="/moderation">Moderation</Link><a href="#requests">Requests ({view?.requests.length??'…'} on page)</a><a href="#followups">Follow-ups ({view?.followups.length??'…'})</a><a href="#receipts">Audit receipts</a><a href="#health">Health & limits</a></nav>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{loading&&<p role="status">Loading operations…</p>}
 <button disabled={busy||loading} onClick={()=>void refresh()}>Refresh current page</button>
 {pending&&<section className="notice" aria-label="Unconfirmed decision"><h2>Unconfirmed decision</h2><p>{String(parse(pending.body).action)} · {String(parse(pending.body).request_id||parse(pending.body).id||parse(pending.body).receipt_id||'Relay control')}</p><p>Keep this page open until confirmed. Other decisions are paused. A retry sends the same key, payload and revision, including the original publication confirmation.</p><details><summary>Saved decision payload</summary><pre>{JSON.stringify(parse(pending.body),null,2)}</pre></details><button disabled={busy} onClick={()=>void decide()}>{busy?'Confirming…':'Retry saved decision'}</button></section>}
 {view&&<><section className="panel panel-body"><h2>Relay control</h2><p><strong>{view.control.enabled?'Enabled':'Paused'}</strong> · Revision {view.control.revision}</p><p>Private audit reason: Moderation {view.control.enabled?'paused':'enabled'} Relay.</p><button disabled={disabled} onClick={()=>void decide({action:'control',enabled:!view.control.enabled,expected_revision:view.control.revision})}>{view.control.enabled?'Pause Relay and request intake':'Enable Relay and request intake'}</button></section>
 <section id="requests"><h2>Requests</h2><nav className="owner-nav" aria-label="Request pages"><button disabled={disabled||view.offset===0} onClick={()=>void refresh(Math.max(0,view.offset-50))}>Previous requests</button><span>Page {Math.floor(view.offset/50)+1} · {view.requests.length} requests</span><button disabled={disabled||view.next_offset===null} onClick={()=>void refresh(view.next_offset!)}>Next requests</button></nav>{!view.requests.length&&<p>No requests on this page.</p>}{view.requests.map(row=><RequestCard key={row.id+':'+row.revision} row={row} busy={disabled} decide={decide}/>)}</section>
 <section id="followups"><h2>Open follow-ups ({view.followups.length}; first 50)</h2>{!view.followups.length&&<p>No open follow-ups.</p>}{view.followups.map(f=><section className="panel panel-body" key={f.id}><h3>{f.target_id}</h3><p>{moderationText(f.reason)}</p><p>Private audit reason: Moderation resolved follow-up; task history unchanged.</p><button disabled={disabled} onClick={()=>void decide({action:'resolve',id:f.id})}>Mark reviewed and resolve</button></section>)}</section>
 <details id="health"><summary>Health, source and operating limits</summary><p>Source: <code>{view.source_version}</code></p><p>{view.health?'Latest observation: '+new Date(view.health.observed_at).toISOString():'No health observation available.'}</p><pre>{JSON.stringify(view.health,null,2)}</pre><pre>{JSON.stringify(view.limits,null,2)}</pre></details>
 <details id="receipts"><summary>Private audit receipts (latest {view.receipts.length})</summary>{view.receipts.map(r=><details key={r.id}><summary>{auditRuleLabel(r.policy_rule)} · {new Date(r.created_at).toISOString()}</summary><p>Target: {r.target_id}</p><p>{moderationText(r.reason)}</p><pre>{JSON.stringify(receiptPresentation(r),null,2)}</pre>{r.policy_rule==='lease.expired_unsubmitted.v1'&&<><p>Private audit reason: Moderation restored exact pre-expiry lease. Original expiry still applies.</p><button disabled={disabled} onClick={()=>void decide({action:'restore',receipt_id:r.id})}>Restore exact prior lease if untouched</button></>}</details>)}</details>
 </>}</main>;
}
function RequestSummary({value}:{value:unknown}){
 const record=object(value),criteria=record.acceptance_criteria,sources=record.sources||record.next_action_sources;
 return <dl className="request-summary">{['title','objective','beneficiary','next_action','expected_output','assessment','reason','status'].filter(k=>typeof record[k]==='string').map(k=><div key={k}><dt>{k.replaceAll('_',' ')}</dt><dd>{String(record[k])}</dd></div>)}{Array.isArray(criteria)&&<div><dt>Acceptance criteria</dt><dd><ul>{criteria.filter((value):value is string=>typeof value==='string').map((value,i)=><li key={i}>{value}</li>)}</ul></dd></div>}{Array.isArray(sources)&&<div><dt>Starting sources · untrusted references</dt><dd><ul>{sources.filter((url):url is string=>typeof url==='string'&&url.startsWith('https://')).map((url,i)=><li key={i}><a href={url} rel="noreferrer" {...externalLinkProps(url,"noreferrer")}>{url}</a></li>)}</ul></dd></div>}</dl>;
}
export function RequestCard({row,busy,decide}:{row:RequestRow;busy:boolean;decide:(v:Record<string,unknown>)=>Promise<void>}){
 const originalJson=parseJson(row.input_json),assessmentJson=parseJson(row.assessment_json),original=object(originalJson),assessment=object(assessmentJson),savedDraft=JSON.stringify(parseJson(row.draft_json),null,2)||'{}';
 const [draft,setDraft]=useState(savedDraft),[reviewed,setReviewed]=useState(false),[confirm,setConfirm]=useState(false),[reason,setReason]=useState(''),[error,setError]=useState('');
 const base={request_id:row.id,expected_revision:row.revision};
 return <section className="panel panel-body"><h3>{typeof original.title==='string'?original.title:'Untitled proposal'}</h3><p>{row.status} · Revision {row.revision} · <time dateTime={new Date(row.created_at).toISOString()}>{new Date(row.created_at).toISOString()}</time></p><p className="meta">Request {row.id}</p><p>{moderationText(row.reason)}</p><RequestSummary value={originalJson}/>
 {row.task_id&&<p><Link href={'/tasks/'+row.task_id}>View published task →</Link></p>}
 {row.assessment_json&&<><h4>Relay assessment</h4><RequestSummary value={assessment.assessment||assessment}/><details><summary>Assessment checks and diagnostics</summary><pre>{JSON.stringify(assessmentJson,null,2)}</pre></details></>}
 <details><summary>Original untrusted request · JSON</summary><pre>{JSON.stringify(originalJson,null,2)}</pre></details>
 {row.status!=='PUBLISHED'&&<><h4>Publication draft</h4><RequestSummary value={parseJson(draft)}/><details><summary>Edit exact publication draft · JSON</summary><label>Exact publication draft<textarea rows={14} value={draft} onChange={e=>{setDraft(e.target.value);setReviewed(false);setConfirm(false);setError('')}}/></label></details>
 <p><label><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)}/> I checked the sources, public benefit, duplicates, and safe scope of this draft.</label></p>
 <p className="meta">Private audit reason: Moderation reviewed normalized draft; separate publication confirmation required.</p><button disabled={busy||!reviewed} onClick={()=>{try{const value:unknown=JSON.parse(draft);setError('');void decide({...base,action:'prepare',draft:value,confirm_review:true})}catch{setError('Draft must be valid JSON')}}}>Prepare reviewed draft</button>
 {row.status==='DRAFT'&&<><p><label><input type="checkbox" checked={confirm} disabled={busy} onChange={e=>setConfirm(e.target.checked)}/> Publish the saved draft shown above as a new public task.</label></p><p className="meta">Private audit reason: Moderation explicitly confirmed this exact draft and revision.</p><button disabled={busy||!confirm||draft!==savedDraft} onClick={()=>void decide({...base,action:'publish',draft_hash:row.draft_hash,confirm_publication:true})}>Confirm publication</button></>}
 <hr/><p className="meta">Private status reason: Moderation held request for further review.</p><button disabled={busy} onClick={()=>void decide({...base,action:'hold'})}>Hold for review</button><label>Private decline reason (visible to the status-key holder)<input value={reason} maxLength={200} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||!reason.trim()} onClick={()=>void decide({...base,action:'deny',reason})}>Decline with resubmission allowed</button>{error&&<p role="alert">{error}</p>}</>}
 </section>;
}
