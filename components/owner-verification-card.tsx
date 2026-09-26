'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Evidence} from './evidence';

export type OwnerCandidate={
 id:string;result_id:string;title:string;revision:number;description:string;objective:string;expected_output:string;acceptance_criteria:string[];
 result_content:string;evidence:string[];owner_review_state:string;owner_verification_failed:boolean;
 consensus:{dispute:number;votes:{id:string;author_name:string;verdict:string;completeness:string;independence:{label:string};content:string;evidence:string[]}[]};
 open_subtasks:{id:string;title:string;status:string}[];
 owner_verification_history:{id:number;created_at:string;outcome:string;reason:string}[];
};
type OwnerAction={action:string;task_id:string;result_id:string;reason:string;expected_review_state:string;outcome?:string;criteria_checked?:boolean};
export default function OwnerVerificationCard({task:t,busy,onAction}:{task:OwnerCandidate;busy:boolean;onAction:(value:OwnerAction)=>Promise<void>}){
 const [reason,setReason]=useState(''),[checked,setChecked]=useState(false);
 const decide=(outcome:string)=>onAction({action:'owner-verification',task_id:t.id,result_id:t.result_id,expected_review_state:t.owner_review_state,outcome,reason});
 return <article className="result-card" style={{overflowWrap:'anywhere'}}>
  <h3>{t.title}</h3><p>Contract revision {t.revision} · Candidate {t.result_id}</p>
  <h4>Completion contract</h4><p className="content">{t.description}</p><p>{t.objective}</p><p>Expected output: {t.expected_output}</p>
  <ul>{t.acceptance_criteria.map((c:string)=><li key={c}>{c}</li>)}</ul>
  <h4>Candidate result</h4><p className="content">{t.result_content}</p><Evidence urls={t.evidence||[]}/>
  <h4>Recorded reviews</h4>{t.consensus.votes.map(v=><section key={v.id}><p>{v.author_name} · {v.verdict} · Reviewer completeness assessment: {v.completeness||'unknown'} · {v.independence.label}</p><p className="content">{v.content}</p><Evidence urls={v.evidence}/></section>)}
  <p>Disputes: {t.consensus.dispute}. Unfinished subtasks: {t.open_subtasks.length}. {t.owner_verification_failed?"Final verification found that this contribution doesn't yet meet all task requirements.":'Mechanical gates passed; owner verification is still required.'}</p>
  {t.open_subtasks.map(s=><p key={s.id}><a href={'/tasks/'+s.id}>{s.title}</a> · {s.status}</p>)}
  {t.owner_verification_history.map(v=><p key={v.id}>{v.created_at} · {v.outcome==='failed'?'More work needed':'Final verification '+v.outcome}: {v.reason}</p>)}
  <a href={'/tasks/'+t.id+'#result-'+t.result_id}>Full task, evidence and public history →</a>
  <p><label>Public decision reason (20–1,000 characters)<textarea className="search" maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label></p>
  {!t.owner_verification_failed&&<p><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I checked the full completion contract, candidate, reviews and blockers; every required part is satisfied.</label></p>}
  <div className="actions">{t.owner_verification_failed?<Button disabled={busy||reason.trim().length<20} onClick={()=>decide('reopened')}>Reopen owner verification</Button>:<>
   <Button variant="outline" disabled={busy||reason.trim().length<20} onClick={()=>decide('failed')}>Record unmet completion requirements</Button>
   <Button disabled={busy||!checked||reason.trim().length<20} onClick={()=>onAction({action:'accept',task_id:t.id,result_id:t.result_id,reason,criteria_checked:true,expected_review_state:t.owner_review_state})}>Accept verified completion</Button>
  </>}</div>
 </article>;
}
