'use client';
import {useEffect,useRef,useState} from 'react';
import {categories} from '@/lib/categories';
import {publicHttpsUrl} from '@/lib/sources';
import {privateFailure,privateReceipt,startBoundedRequest,type BoundedRequest,type PrivateReceipt} from '@/lib/private-request-client';
const newKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const fields=['title','objective','beneficiary','next_action','expected_output','acceptance_criteria','sources'] as const;
type Field=typeof fields[number];
type Attempt={readonly key:string;readonly body:string;receipt?:PrivateReceipt;error?:string};
const labels:Record<Field,string>={title:'Title',objective:'What needs to be learned?',beneficiary:'Who benefits?',next_action:'First five-minute step',expected_output:'Expected output',acceptance_criteria:'Acceptance criteria (one per line, up to five)',sources:'Public HTTPS starting sources (one per line, up to five)'};
const lines=(value:string)=>value.split('\n').map(line=>line.trim()).filter(Boolean);

export default function TaskRequestForm(){
 const [lookupKey,setLookupKey]=useState(''),[result,setResult]=useState<PrivateReceipt|null>(null),[lookupError,setLookupError]=useState(''),[copied,setCopied]=useState('');
 const [attempts,setAttempts]=useState<Attempt[]>([]),[activeKey,setActiveKey]=useState(''),[phase,setPhase]=useState(''),[fieldErrors,setFieldErrors]=useState<Partial<Record<Field,string>>>({});
 const current=useRef<BoundedRequest|null>(null),mounted=useRef(true),form=useRef<HTMLFormElement>(null),active=useRef<Attempt|null>(null);
 const busy=Boolean(phase);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;current.current?.abort();current.current=null}},[]);
 function remember(attempt:Attempt){
  setAttempts(previous=>previous.some(item=>item.key===attempt.key)?previous.map(item=>item.key===attempt.key?attempt:item):[...previous,attempt]);
  if(active.current?.key===attempt.key)active.current=attempt;
 }
 async function submit(attempt:Attempt,retry=false){
  if(current.current)return;
  const operation=startBoundedRequest('/api/task-requests',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:attempt.body});
  current.current=operation;setPhase(retry?'Retrying original private proposal…':'Submitting private proposal…');
  remember({...attempt,error:undefined});
  try{
   const {response,data}=await operation.result,receipt=privateReceipt(response,data);
   if(mounted.current&&current.current===operation)remember({...attempt,receipt,error:undefined});
  }catch(error){
   if(mounted.current&&current.current===operation)remember({...attempt,error:'Submission not confirmed. '+privateFailure(error)+' Its outcome is unknown; check status or retry the exact saved submission.'});
  }finally{if(mounted.current&&current.current===operation){current.current=null;setPhase('')}}
 }
 function send(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(current.current||active.current)return;
  const data=new FormData(event.currentTarget),values=Object.fromEntries(fields.map(name=>[name,String(data.get(name)||'').trim()])) as Record<Field,string>;
  const errors:Partial<Record<Field,string>>={};
  for(const name of fields){
   if(name==='sources'||name==='acceptance_criteria')continue;
   const min=name==='title'?2:1,max=name==='title'?100:2000;
   if(values[name].length<min)errors[name]=name==='title'?'Enter a title with at least two characters.':'Enter text; spaces alone are not enough.';
   else if(values[name].length>max)errors[name]=`Use no more than ${max} characters.`;
  }
  const sources=lines(values.sources),criteria=lines(values.acceptance_criteria);
  if(sources.length<1||sources.length>5)errors.sources='Enter one to five public HTTPS sources, one per line.';
  else if(sources.some(url=>!publicHttpsUrl.safeParse(url).success))errors.sources='Use public HTTPS URLs without credentials, IP addresses, or local hostnames, one per line (up to 2,000 characters each).';
  if(criteria.length<1||criteria.length>5)errors.acceptance_criteria='Enter one to five acceptance criteria, one per line.';
  else if(criteria.some(value=>value.length>2000))errors.acceptance_criteria='Keep each acceptance criterion within 2,000 characters.';
  setFieldErrors(errors);
  const first=fields.find(name=>errors[name]);if(first){(event.currentTarget.elements.namedItem(first) as HTMLTextAreaElement)?.focus();return}
  const key=newKey(),payload={request_key:key,title:values.title,objective:values.objective,beneficiary:values.beneficiary,next_action:values.next_action,expected_output:values.expected_output,category:String(data.get('category')||''),intent:'public_good_research',website:String(data.get('website')||''),sources,acceptance_criteria:criteria};
  const attempt={key,body:JSON.stringify(payload)};active.current=attempt;setActiveKey(key);setLookupKey(key);setResult(null);setLookupError('');setCopied('');void submit(attempt);
 }
 async function status(key=lookupKey){
  if(current.current)return;
  setLookupKey(key);setLookupError('');setResult(null);
  if(!/^[a-f0-9]{64}$/.test(key)){setLookupError('Enter the 64-character hexadecimal private status key.');document.getElementById('private-status-key')?.focus();return}
  const operation=startBoundedRequest('/api/task-requests',{headers:{'X-Request-Key':key},credentials:'omit',cache:'no-store'});
  current.current=operation;setPhase('Checking private request status…');
  try{
   const {response,data}=await operation.result,receipt=privateReceipt(response,data);
   if(mounted.current&&current.current===operation){setResult(receipt);setAttempts(previous=>previous.map(attempt=>attempt.key===key?{...attempt,receipt,error:undefined}:attempt));if(active.current?.key===key)active.current={...active.current,receipt,error:undefined}}
  }catch(error){if(mounted.current&&current.current===operation)setLookupError('Status unavailable. '+privateFailure(error)+' Keep the key and try again.')}
  finally{if(mounted.current&&current.current===operation){current.current=null;setPhase('')}}
 }
 function startNew(){active.current=null;setActiveKey('');setFieldErrors({});form.current?.querySelector<HTMLTextAreaElement>('[name=title]')?.focus()}
 return <div className="form-controls request-form"><form ref={form} noValidate onSubmit={send}>
 {fields.map(name=><p key={name}><label htmlFor={'request-'+name}>{labels[name]}</label><br/>
 <textarea id={'request-'+name} name={name} required minLength={name==='title'?2:1} maxLength={name==='sources'||name==='acceptance_criteria'?10010:name==='title'?100:2000} rows={name==='title'?1:3} style={{width:'100%'}} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name]?'request-'+name+'-error':undefined}/>
 {fieldErrors[name]&&<span id={'request-'+name+'-error'} className="field-error">{fieldErrors[name]}</span>}</p>)}
 <p><label>Category <select name="category">{Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></p>
 <input type="hidden" name="intent" value="public_good_research"/>
 <div hidden aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <p>By submitting, you confirm these details for private assessment and allow Relay to publish a clearly qualified, source-verified task within its daily limit, or the owner to review, edit and publish it. Task outputs will use CC BY 4.0; linked sources retain their own licenses.</p>
 <button className="tech-button" disabled={busy||Boolean(activeKey)}>Submit private request</button>{activeKey&&<><p>The original submission is saved below for recovery. Edits here become a separate proposal when you start a new proposal.</p><button type="button" disabled={busy} onClick={startNew}>Start new proposal</button></>}
 </form>{phase&&<p role="status">{phase}</p>}
 {attempts.length>0&&<section aria-label="Submitted private proposals"><h2>Your submissions in this session</h2>{attempts.map((attempt,index)=><article className="private-request-attempt" key={attempt.key}><h3>Private proposal {index+1}</h3>{attempt.receipt&&<p role="status">{attempt.receipt.status}: {attempt.receipt.reason}</p>}{attempt.error&&<p role="alert">{attempt.error}</p>}{attempt.receipt?.task_id&&<p><a href={'/tasks/'+attempt.receipt.task_id}>View published task →</a></p>}<p style={{overflowWrap:'anywhere'}}>Private request key: <code>{attempt.key}</code></p><div className="actions">{!attempt.receipt&&<button type="button" disabled={busy} onClick={()=>void submit(attempt,true)}>Retry exact submission</button>}<button type="button" disabled={busy} onClick={()=>void status(attempt.key)}>Check this request’s status</button></div></article>)}</section>}
 <section id="request-status" aria-label="Private request receipt"><h2>Request status</h2>{result&&<p role="status">{result.status}: {result.reason}</p>}{lookupError&&<p role="alert">{lookupError}</p>}{result?.task_id&&<p><a href={'/tasks/'+result.task_id}>View published task →</a></p>}<p>Save your private key to return here and check the decision. It stays out of links and browser history. Proposal details and earlier keys are kept only for this page session.</p><label htmlFor="private-status-key">Private status key (save it)</label><input id="private-status-key" aria-label="Private status key" disabled={busy} value={lookupKey} maxLength={64} autoComplete="off" spellCheck={false} onChange={e=>{setLookupKey(e.target.value);setResult(null);setLookupError('');setCopied('')}} style={{width:'100%'}}/>
 <div className="actions"><button type="button" disabled={!lookupKey||busy} onClick={async()=>{try{await navigator.clipboard.writeText(lookupKey);if(mounted.current)setCopied('Status key copied.')}catch{if(mounted.current)setCopied('Copy unavailable. Select and copy the key field.')}}}>Copy status key</button><a href="/task-requests#request-status">Return to status lookup</a></div>{copied&&<p role="status">{copied}</p>}<p><button type="button" onClick={()=>void status()} disabled={busy||!lookupKey}>Check status</button></p></section></div>;
}
