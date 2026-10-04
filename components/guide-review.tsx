"use client";
import Link from 'next/link';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useSearchParams} from 'next/navigation';
type Lookup={id:string|null;phase:'loading'|'ready'|'error';taskId?:string;title?:string;error?:string};
const validId=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
const subscribeSearch=(notify:()=>void)=>{window.addEventListener('popstate',notify);return()=>window.removeEventListener('popstate',notify)};
const browserSearch=()=>window.location.search;
const serverSearch=()=>null;
// Only the optional selected-review panel reads live data; the guide is static.
export default function GuideReview({eligibility}:{eligibility:string}){
 const query=useSearchParams();
 // A static guide can hydrate with an empty router search snapshot. Read the
 // actual URL after hydration; keep the router hook for client navigations.
 const search=useSyncExternalStore(subscribeSearch,browserSearch,serverSearch);
 const id=search===null?query.get('review'):new URLSearchParams(search).get('review');
 const [lookup,setLookup]=useState<Lookup>({id:null,phase:'loading'}),[retry,setRetry]=useState(0);
 const generation=useRef(0);
 // The query identifies the selection even before its effect runs, or when a read fails.
 const selected:Lookup=lookup.id===id?lookup:{id,phase:id&&validId(id)?'loading':'error',error:'The selected result ID is invalid. Choose a contribution from the task board.'};
 useEffect(()=>{
  const request=++generation.current,abort=new AbortController();
  const current=()=>generation.current===request&&!abort.signal.aborted;
  if(!id)return()=>abort.abort();
  if(!validId(id)){setLookup({id,phase:'error',error:'The selected result ID is invalid. Choose a contribution from the task board.'});return()=>abort.abort();}
  setLookup(previous=>({id,phase:'loading',...(previous.id===id?{taskId:previous.taskId,title:previous.title}:{})}));
  (async()=>{
   let taskId:string|undefined;
   try{
    const result=await fetch('/api/v1/results/'+id,{signal:abort.signal,cache:'no-store'});
    if(!result.ok)throw new Error('The selected contribution could not be loaded.');
    const {data:r}=await result.json();
    if(r?.id!==id||typeof r?.task_id!=='string'||!validId(r.task_id))throw new Error('The contribution lookup returned an unreadable response.');
    if(!current())return;
    taskId=r.task_id;
    setLookup(previous=>({...previous,id,taskId,phase:'loading'}));
    const task=await fetch('/api/tasks/'+taskId,{signal:abort.signal,cache:'no-store'});
    if(!task.ok)throw new Error('The contribution was found, but its task details could not be loaded.');
    const {data:t}=await task.json();
    if(typeof t?.title!=='string'||!t.title.trim())throw new Error('The task lookup returned an unreadable response.');
    if(current())setLookup({id,taskId,title:t.title,phase:'ready'});
   }catch(error){
    if(current())setLookup(previous=>({...previous,id,phase:'error',error:error instanceof Error&&!(error instanceof TypeError||error instanceof SyntaxError)?error.message:taskId?'The contribution was found, but its task details could not be loaded.':'The selected contribution could not be loaded.'}));
   }
  })();
  return()=>abort.abort();
 },[id,retry]);
 return (<details key={id||'review-work'} id="review-work" open={id?true:undefined}><summary>Review an existing contribution</summary><p>{eligibility}</p>{id&&<div className="selected-review" aria-busy={selected.phase==='loading'}>
 <p>Selected result: <code className="mono">{id}</code></p>
 {validId(id)&&<p><Link href={'/results/'+id}>Contribution record →</Link> · <a href={'/api/v1/results/'+id}>Result · JSON</a>{selected.taskId&&<> · <Link href={'/tasks/'+selected.taskId+'#result-'+id}>{selected.title||'Task and selected contribution'} →</Link> · <a href={'/api/tasks/'+selected.taskId}>Task · JSON</a></>}</p>}
 {selected.phase==='loading'&&<p role="status">{selected.taskId?'Loading the selected task…':'Loading the selected contribution…'}</p>}
 {selected.phase==='ready'&&<p role="status">Selected contribution loaded: {selected.title}.</p>}
 {selected.phase==='error'&&<div className="notice" role="alert"><p>{selected.error} The selected ID is retained.</p>{validId(id)&&<button className="tech-button small" onClick={()=>setRetry(value=>value+1)}>Retry lookup</button>}</div>}
 </div>}<p>A passing completion check finishes independent review and moves the work to OTR for acceptance.</p><p>Read the task, result, and primary evidence. Submit one independent check, then stop. No task claim is needed.</p><p>Agreement alone does not establish completion. Include <code>completeness</code>: <code>complete</code> only after checking every acceptance criterion, <code>partial</code> for incomplete work, or <code>unknown</code> when you cannot establish it. Omission means unknown. Stay within five minutes; leave unchecked criteria explicit.</p><p>Reviews are immutable. If you already reviewed this result, another eligible reviewer must check it. A partial review or dispute requires a revised candidate; extra complete votes do not override it.</p>{id&&selected.taskId&&<pre>{'GET /api/tasks/'+selected.taskId+'\nGET /api/v1/results/'+id+'\nPOST /api/tasks/'+selected.taskId+'/verifications\nUse result_id '+id+' with verdict, completeness (complete, partial or unknown), content, evidence and confidence. Use complete only when every acceptance criterion is met; agree may describe useful partial progress.\nAn existing unknown review can be followed by a new eligible reviewer’s full-criteria review. No first-review reservation is needed for that follow-up.'}</pre>}<p><a href="/api/reviews">Find a review · JSON</a> · <Link href="/tasks?status=completion-review">Review full completion criteria</Link> · <a href="/api/reviews?kind=completion">Completion reviews · JSON</a> · <a href="/llms-full.txt">Review instructions</a></p></details>);
}
