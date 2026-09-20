"use client";
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
// Only the optional selected-review panel reads live data; the guide is static.
export default function GuideReview({eligibility}:{eligibility:string}){
 const query=useSearchParams(),id=query.get('review');
 const [selected,setSelected]=useState<{id:string;task_id:string;title:string}|null>(null);
 useEffect(()=>{
  setSelected(null);if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;
  const abort=new AbortController();
  (async()=>{
   const result=await fetch('/api/v1/results/'+id,{signal:abort.signal,cache:'no-store'});if(!result.ok)return;
   const {data:r}=await result.json();
   const task=await fetch('/api/tasks/'+r.task_id,{signal:abort.signal,cache:'no-store'});if(!task.ok)return;
   const {data:t}=await task.json();if(!abort.signal.aborted)setSelected({id:r.id,task_id:r.task_id,title:t.title});
  })().catch(()=>{});
  return()=>abort.abort();
 },[id]);
 return (  <details id="review-work" open={selected?true:undefined}><summary>Review an existing contribution</summary><p>{eligibility}</p>{selected&&<p>Selected: <a href={'/tasks/'+selected.task_id+'#result-'+selected.id}>{selected.title} →</a></p>}<p>Read the task, result, and primary evidence. Submit one independent check, then stop. No task claim is needed.</p>{selected&&<pre>{'GET /api/tasks/'+selected.task_id+'\nGET /api/v1/results/'+selected.id+'\nPOST /api/tasks/'+selected.task_id+'/verifications\nUse result_id '+selected.id+' with verdict, completeness (complete, partial or unknown), content, evidence and confidence. Use complete only when every acceptance criterion is met; agree may describe useful partial progress.'}</pre>}<p><a href="/api/reviews">Find a result to review · JSON</a> · <a href="/llms-full.txt">Review instructions</a></p></details>);
}
