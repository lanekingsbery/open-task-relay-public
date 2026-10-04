'use client';
import Link from 'next/link';
import {verificationReason} from '@/lib/moderation-copy';
import {resultSummary} from '@/lib/relay';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Evidence} from './evidence';

export type OwnerCandidate={
 id:string;result_id:string;title:string;revision:number;description:string;objective:string;expected_output:string;acceptance_criteria:string[];
 result_content:string;evidence:string[];owner_review_state:string;owner_verification_failed:boolean;
 consensus:{dispute:number;votes:{id:string;author_name:string;verdict:string;completeness:string;independence:{label:string};content:string;evidence:string[]}[]};
 finishing_missing?:string[];finishing_work_needed?:boolean;finishing_next_action?:string;proposed_conclusion?:string;component_reviews?:{id:string;result_id:string;content:string;completeness:string;author_name:string;evidence:string[]}[];
 open_subtasks:{id:string;title:string;status:string}[];
 owner_verification_history:{id:number;created_at:string;outcome:string;reason:string;actor?:string}[];
};
type OwnerAction={action:string;task_id:string;result_id:string;reason:string;expected_review_state:string;outcome?:string;criteria_checked?:boolean;review_basis?:string;review_ids?:string[];conclusion?:string};
export default function OwnerVerificationCard({task:t,busy,onAction}:{task:OwnerCandidate;busy:boolean;onAction:(value:OwnerAction)=>Promise<void>}){
 const [reason,setReason]=useState(''),[conclusion,setConclusion]=useState('');
 const allReviews=t.component_reviews||[],reviews=allReviews.slice(0,40),blocked=t.owner_verification_failed||t.consensus.dispute>0||t.open_subtasks.length>0||!reviews.length;
 const decide=(outcome:string)=>onAction({action:'owner-verification',task_id:t.id,result_id:t.result_id,expected_review_state:t.owner_review_state,outcome,reason});
 const accept=()=>onAction({action:'accept',task_id:t.id,result_id:t.result_id,reason,criteria_checked:true,
  review_basis:reason.trim(),review_ids:reviews.map(v=>v.id),
  ...(conclusion.trim()?{conclusion:conclusion.trim()}:{}),expected_review_state:t.owner_review_state});
 return <article className="result-card moderation-card" id={'accept-'+t.result_id}>
  <p className="eyebrow">Work acceptance · {t.owner_verification_failed?'Changes requested':'Independent evidence ready'}</p>
  <h3>{t.title}</h3><p className="content">{resultSummary(t.result_content,420)}</p>
  {Boolean(t.finishing_missing?.length)?<div className="notice"><strong>Recorded gaps</strong><ul>{t.finishing_missing?.map(m=><li key={m}>{m}</li>)}</ul></div>:Boolean(t.finishing_work_needed)&&t.finishing_next_action&&<p className="notice"><strong>Recorded next step</strong> · {t.finishing_next_action}</p>}<h4>Task requirements</h4><ul>{t.acceptance_criteria.map(c=><li key={c}>{c}</li>)}</ul>
  <details><summary>Full contract and candidate</summary><p className="meta">Contract revision {t.revision} · Candidate {t.result_id}</p><p>{t.description}</p><p>{t.objective}</p><p>Expected output: {t.expected_output}</p><p className="content">{t.result_content}</p></details>
  <details><summary>Sources · {t.evidence.length}</summary><Evidence urls={t.evidence}/></details>
  <details><summary>Independent checks · {allReviews.length}</summary>{allReviews.length>reviews.length&&<p>Acceptance cites the first {reviews.length} checks below.</p>}{allReviews.map(v=><section key={v.id}><p><strong>{v.author_name}</strong> · {v.completeness||'unknown'}</p><p className="content">{v.content}</p><Evidence urls={v.evidence}/>{v.result_id!==t.result_id&&<Link href={'/tasks/'+t.id+'#result-'+v.result_id}>Source contribution</Link>}</section>)}<details><summary>All recorded reviews</summary>{t.consensus.votes.map(v=><section key={v.id}><p>{v.author_name} · {v.verdict} · {v.completeness||'unknown'} · {v.independence.label}</p><p className="content">{v.content}</p><Evidence urls={v.evidence}/></section>)}</details></details>
  {t.consensus.dispute>0&&<p className="notice">Acceptance blocked: {t.consensus.dispute} recorded dispute(s).</p>}
  {t.open_subtasks.length>0&&<div className="notice">Acceptance blocked: unfinished subtasks.{t.open_subtasks.map(s=><p key={s.id}><Link href={'/tasks/'+s.id}>{s.title}</Link> · {s.status}</p>)}</div>}
  {!reviews.length&&<p className="notice">Acceptance blocked: no eligible independent evidence check.</p>}
  {t.owner_verification_failed&&<p className="notice">Changes requested: {verificationReason(t.owner_verification_history.find(v=>v.outcome==='failed')||{reason:'Unmet completion requirements.'})}</p>}
  {t.owner_verification_history.length>0&&<details><summary>Moderation history</summary>{t.owner_verification_history.map(v=><p key={v.id}>{v.created_at} · {v.outcome==='failed'?'Changes requested':'Check reopened'}: {verificationReason(v)}</p>)}</details>}
  <p><Link href={'/tasks/'+t.id+'#result-'+t.result_id}>Full task and public history →</Link></p>
  <label>Decision reason (20–1,000 characters)<textarea maxLength={1000} minLength={20} placeholder="Explain how the recorded checks support acceptance, or what needs changing." value={reason} onChange={e=>setReason(e.target.value)}/></label>
  {!t.owner_verification_failed&&<details><summary>Add a public conclusion (optional)</summary><label>What the work established<textarea maxLength={420} minLength={20} value={conclusion} onChange={e=>setConclusion(e.target.value)}/></label></details>}
  <div className="actions">{t.owner_verification_failed?<Button disabled={busy||reason.trim().length<20} onClick={()=>decide('reopened')}>Reopen acceptance check</Button>:<>
   <Button disabled={busy||blocked||reason.trim().length<20||(Boolean(conclusion.trim())&&conclusion.trim().length<20)} onClick={accept}>Accept work</Button>
   <Button variant="outline" disabled={busy||reason.trim().length<20} onClick={()=>decide('failed')}>Request changes</Button>
  </>}</div>
 </article>;
}
