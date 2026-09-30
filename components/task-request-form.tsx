'use client';
import {useEffect,useRef,useState} from 'react';
import {categories} from '@/lib/categories';
import {publicHttpsUrl} from '@/lib/sources';
import {privateFailure,privateReceipt,startBoundedRequest,type BoundedRequest,type PrivateReceipt} from '@/lib/private-request-client';
import './task-request-form.css';
const newKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const fields=['title','objective','beneficiary','next_action','expected_output','acceptance_criteria','sources'] as const;
type Field=typeof fields[number];
type Attempt={readonly key:string;readonly body:string;receipt?:PrivateReceipt;error?:string};
const labels:Record<Field,string>={title:'Give your idea a title',objective:'What needs checking?',beneficiary:'Who would it help?',next_action:'What could someone do in five minutes?',expected_output:'What should they produce?',acceptance_criteria:'What would a good result include?',sources:'Starting sources'};
const hints:Partial<Record<Field,string>>={next_action:'Choose one small first step.',expected_output:'For example, a cited comparison or a checked list.',acceptance_criteria:'Up to five clear requirements, one per line.',sources:'Public HTTPS links, one per line. Add one to five.'};
const receiptLabels:Record<PrivateReceipt['status'],string>={HOLD:'Awaiting review',DENY:'Declined',DRAFT:'Draft prepared',PUBLISHED:'Published'};
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
  current.current=operation;setPhase(retry?'Retrying saved suggestion…':'Sending suggestion…');
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
  current.current=operation;setPhase('Checking suggestion status…');
  try{
   const {response,data}=await operation.result,receipt=privateReceipt(response,data);
   if(mounted.current&&current.current===operation){setResult(receipt);setAttempts(previous=>previous.map(attempt=>attempt.key===key?{...attempt,receipt,error:undefined}:attempt));if(active.current?.key===key)active.current={...active.current,receipt,error:undefined}}
  }catch(error){if(mounted.current&&current.current===operation)setLookupError('Status unavailable. '+privateFailure(error)+' Keep the key and try again.')}
  finally{if(mounted.current&&current.current===operation){current.current=null;setPhase('')}}
 }
 function startNew(){active.current=null;setActiveKey('');setFieldErrors({});form.current?.querySelector<HTMLTextAreaElement>('[name=title]')?.focus()}
 function field(name:Field){
  const hintId=hints[name]?'request-'+name+'-hint':undefined,errorId=fieldErrors[name]?'request-'+name+'-error':undefined;
  return <div key={name} className={'request-field request-field-'+name}><label htmlFor={'request-'+name}>{labels[name]}</label>
   {hints[name]&&<p id={hintId} className="request-hint">{hints[name]}</p>}
   <textarea id={'request-'+name} name={name} required minLength={name==='title'?2:1} maxLength={name==='sources'||name==='acceptance_criteria'?10010:name==='title'?100:2000} rows={name==='title'?1:3} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={[hintId,errorId].filter(Boolean).join(' ')||undefined}/>
   {fieldErrors[name]&&<span id={errorId} className="field-error">{fieldErrors[name]}</span>}
  </div>;
 }
 return <div className="form-controls request-form"><form ref={form} noValidate onSubmit={send}>
 <fieldset className="request-group"><legend>Task idea</legend><div className="request-fields">{field('title')}{field('objective')}{field('beneficiary')}<div className="request-field"><label htmlFor="request-category">Topic</label><select id="request-category" name="category">{Object.entries(categories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div></div></fieldset>
 <fieldset className="request-group"><legend>Useful starting point</legend><div className="request-fields">{field('next_action')}{field('expected_output')}{field('acceptance_criteria')}{field('sources')}</div></fieldset>
 <input type="hidden" name="intent" value="public_good_research"/>
 <div hidden aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 <p className="request-consent">By sending, you allow private assessment and publication: Relay may publish a clearly qualified, source-verified task, or the owner may review, edit and publish it. Task outputs use CC BY 4.0; linked sources keep their own licenses. <a href="/privacy#suggestions">How suggestions are handled</a>.</p>
 <button className="tech-button solid request-send" disabled={busy||Boolean(activeKey)}>Send suggestion</button>{activeKey&&<div className="request-new"><p>Your saved attempt is below. To send edits, start a new suggestion.</p><button type="button" disabled={busy} onClick={startNew}>Start new suggestion</button></div>}
 </form>{phase&&<p role="status">{phase}</p>}
 {attempts.length>0&&<section aria-label="Submitted private suggestions"><h2>Your suggestions this session</h2>{attempts.map((attempt,index)=><article className="private-request-attempt" key={attempt.key}><h3>Suggestion {index+1}</h3>{attempt.receipt&&<p role="status"><strong>{receiptLabels[attempt.receipt.status]}</strong>: {attempt.receipt.reason}</p>}{attempt.error&&<p role="alert">{attempt.error}</p>}{attempt.receipt?.task_id&&<p><a href={'/tasks/'+attempt.receipt.task_id}>View published task</a></p>}<p className="request-saved-key">Private key: <code>{attempt.key}</code></p><div className="actions">{!attempt.receipt&&<button type="button" disabled={busy} onClick={()=>void submit(attempt,true)}>Retry exact submission</button>}<button type="button" disabled={busy} onClick={()=>void status(attempt.key)}>Check this suggestion’s status</button></div></article>)}</section>}
 <section id="request-status" aria-label="Private suggestion receipt"><h2>Check a suggestion</h2>{result&&<p role="status"><strong>{receiptLabels[result.status]}</strong>: {result.reason}</p>}{lookupError&&<p role="alert">{lookupError}</p>}{result?.task_id&&<p><a href={'/tasks/'+result.task_id}>View published task</a></p>}<p id="request-key-help">Keep this private key to check your suggestion. It stays out of links and browser history. Details and earlier keys last only for this page session.</p><label htmlFor="private-status-key">Private status key</label><input id="private-status-key" aria-label="Private status key" aria-describedby="request-key-help" disabled={busy} value={lookupKey} maxLength={64} autoComplete="off" spellCheck={false} onChange={e=>{setLookupKey(e.target.value);setResult(null);setLookupError('');setCopied('')}}/>
 <div className="actions"><button type="button" onClick={()=>void status()} disabled={busy||!lookupKey}>Check status</button><button type="button" disabled={!lookupKey||busy} onClick={async()=>{try{await navigator.clipboard.writeText(lookupKey);if(mounted.current)setCopied('Status key copied.')}catch{if(mounted.current)setCopied('Copy unavailable. Select and copy the key field.')}}}>Copy status key</button></div>{copied&&<p role="status">{copied}</p>}</section></div>;
}
