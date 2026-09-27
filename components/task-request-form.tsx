'use client';
import {useState} from 'react';
import {categories} from '@/lib/categories';
const newKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export default function TaskRequestForm(){
 const [key,setKey]=useState(''),[result,setResult]=useState(''),[busy,setBusy]=useState(false);
 async function send(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);try{
  const f=new FormData(event.currentTarget),request_key=key||newKey();setKey(request_key);
  const payload={request_key,...Object.fromEntries(['title','objective','beneficiary','next_action','expected_output','category','intent','website'].map(k=>[k,String(f.get(k)||'')])),
   sources:String(f.get('sources')).split('\n').map(x=>x.trim()).filter(Boolean),acceptance_criteria:String(f.get('acceptance_criteria')).split('\n').map(x=>x.trim()).filter(Boolean)};
  const r=await fetch('/api/task-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();
  setResult(r.ok?j.data.status+': '+j.data.reason:j.error.message);
 }catch{setResult('Unable to confirm submission. Keep the key and retry the identical request.')}finally{setBusy(false)}}
 async function status(){setBusy(true);try{const r=await fetch('/api/task-requests',{headers:{'X-Request-Key':key}}),j=await r.json();setResult(r.ok?j.data.status+': '+j.data.reason+(j.data.task_id?' /tasks/'+j.data.task_id:''):j.error.message)}catch{setResult('Status unavailable. Keep your key and try again.')}finally{setBusy(false)}}
 return <><form onSubmit={send}>
 {['title','objective','beneficiary','next_action','expected_output','acceptance_criteria','sources'].map(name=><p key={name}><label>{({title:'Title',objective:'What needs to be learned?',beneficiary:'Who benefits?',next_action:'First five-minute step',expected_output:'Expected output',acceptance_criteria:'Acceptance criteria (one per line, up to five)',sources:'Public HTTPS starting sources (one per line, up to five)'} as Record<string,string>)[name]}<br/>
 <textarea name={name} required minLength={name==='title'?2:1} maxLength={name==='title'?100:2000} rows={name==='title'?1:3} style={{width:'100%'}}/></label></p>)}
 <p><label>Category <select name="category">{Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></p>
 <p><label>Purpose <select name="intent"><option value="public_good_research">Public-good research</option><option value="promotion">Promotion</option><option value="transaction">Purchase or transaction</option></select></label></p>
 <div hidden aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <p>By submitting, you confirm these details for private assessment and allow Relay to publish a clearly qualified, source-verified task within its daily limit, or the owner to review, edit and publish it. Task outputs will use CC BY 4.0; linked sources retain their own licenses.</p>
 <button className="tech-button" disabled={busy}>Submit private request</button>
 </form><p role="status">{result}</p><label>Private status key (save it)<input aria-label="Private status key" value={key} onChange={e=>setKey(e.target.value)} style={{width:'100%'}}/></label>
 <p><button onClick={status} disabled={busy||!key}>Check status</button> <button disabled={busy} onClick={()=>{setKey(newKey());setResult('New key ready. Correct your request before resubmitting.')}}>Start corrected resubmission</button></p></>;
}
