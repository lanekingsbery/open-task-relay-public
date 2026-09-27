'use client';
import {useEffect,useState} from 'react';
type RequestRow={id:string;status:string;reason:string;draft_json:string;draft_hash:string;revision:number;input_json:string};
type View={offset:number;next_offset:number|null;control:{enabled:number;revision:number};source_version:string;requests:RequestRow[];
 followups:{id:string;target_id:string;reason:string;status:string}[];
 receipts:{id:string;action_key:string;policy_rule:string;reason:string;source_version:string;target_id:string;created_at:number;actor:string}[];
 health:unknown;limits:unknown};
export default function RelayOperatorView(){
 const [view,setView]=useState<View|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function reload(offset=0){const r=await fetch('/api/moderation/relay?offset='+offset),j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Unable to load');setView(j.data)}
 useEffect(()=>{void reload().catch(e=>setError(e.message))},[]);
 async function decide(input:Record<string,unknown>){setBusy(true);setError('');try{const r=await fetch('/api/moderation/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,decision_key:crypto.randomUUID()})}),j=await r.json();if(!r.ok)throw new Error(j.error.message);await reload()}catch(e){setError(e instanceof Error?e.message:'Unable to confirm decision. Reload before another action.')}finally{setBusy(false)}}
 return <main className="prose"><h1>Relay operator decisions</h1><p>Public request text is untrusted. Review sources, scope, duplicates, and public benefit before preparing a draft. Publication requires a second explicit confirmation. Relay cannot review or accept work.</p><p role="alert">{error}</p><button disabled={busy} onClick={()=>void reload().catch(e=>setError(e.message))}>Refresh</button>
 {view&&<><p>Operator: <strong>{view.control.enabled?'Enabled':'Paused'}</strong> · Source: <code>{view.source_version}</code></p>
 <button disabled={busy} onClick={()=>void decide({action:'control',enabled:!view.control.enabled,expected_revision:view.control.revision})}>{view.control.enabled?'Pause Relay and request intake':'Enable v1 Relay and request intake'}</button>
 <h2>Requests (50 per page)</h2><p><button disabled={busy||view.offset===0} onClick={()=>void reload(Math.max(0,view.offset-50)).catch(e=>setError(e.message))}>Previous requests</button> <button disabled={busy||view.next_offset===null} onClick={()=>void reload(view.next_offset!).catch(e=>setError(e.message))}>Next requests</button></p>{view.requests.map(row=><RequestCard key={row.id+':'+row.revision} row={row} busy={busy} decide={decide}/>)}
 <h2>Open follow-ups (first 50)</h2>{view.followups.map(f=><section className="panel panel-body" key={f.id}><p>{f.reason}</p><code>{f.target_id}</code><p><button disabled={busy} onClick={()=>void decide({action:'resolve',id:f.id})}>Mark reviewed and resolve</button></p></section>)}
 <h2>Latest health observation</h2><pre>{JSON.stringify(view.health,null,2)}</pre><details><summary>Operating limits</summary><pre>{JSON.stringify(view.limits,null,2)}</pre></details>
 <h2>Audit receipts (latest 50)</h2>{view.receipts.map(r=><details key={r.id}><summary>{r.policy_rule} · {new Date(r.created_at).toISOString()}</summary><p>{r.reason}</p><pre>{JSON.stringify(r,null,2)}</pre>{r.policy_rule==='lease.expired_unsubmitted.v1'&&<button disabled={busy} onClick={()=>void decide({action:'restore',receipt_id:r.id})}>Restore exact prior lease if untouched (original expiry still applies)</button>}</details>)}
 </>}</main>;
}
function RequestCard({row,busy,decide}:{row:RequestRow;busy:boolean;decide:(v:Record<string,unknown>)=>Promise<void>}){
 const [draft,setDraft]=useState(()=>JSON.stringify(JSON.parse(row.draft_json),null,2)),[reviewed,setReviewed]=useState(false),[confirm,setConfirm]=useState(false),[reason,setReason]=useState(''),[error,setError]=useState('');
 const base={request_id:row.id,expected_revision:row.revision};
 return <section className="panel panel-body"><h3>{row.status} · {row.id}</h3><p>{row.reason}</p><details><summary>Original untrusted request</summary><pre style={{whiteSpace:'pre-wrap'}}>{row.input_json}</pre></details>
 {row.status!=='PUBLISHED'&&<><label>Exact publication draft<textarea aria-label="Exact publication draft" rows={14} value={draft} onChange={e=>{setDraft(e.target.value);setReviewed(false);setConfirm(false)}} style={{width:'100%'}}/></label>
 <p><label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I checked the sources, public benefit, duplicates, and safe scope of this draft.</label></p>
 <button disabled={busy||!reviewed} onClick={()=>{try{void decide({...base,action:'prepare',draft:JSON.parse(draft),confirm_review:true})}catch{setError('Draft must be valid JSON')}}}>Prepare reviewed draft</button>
 {row.status==='DRAFT'&&<><p><label><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/> Publish the saved draft shown above as a new public task.</label></p><button disabled={busy||!confirm||draft!==JSON.stringify(JSON.parse(row.draft_json),null,2)} onClick={()=>void decide({...base,action:'publish',draft_hash:row.draft_hash,confirm_publication:true})}>Confirm publication</button></>}
 <p><button disabled={busy} onClick={()=>void decide({...base,action:'hold'})}>Hold for review</button></p><label>Reason to decline<input value={reason} maxLength={200} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy||!reason.trim()} onClick={()=>void decide({...base,action:'deny',reason})}>Decline with resubmission allowed</button><p role="alert">{error}</p></>}
 </section>;
}
