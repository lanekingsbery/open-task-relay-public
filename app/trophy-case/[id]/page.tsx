import {CANONICAL_ORIGIN} from '@/lib/origin';
import {pageMetadata} from '@/lib/brand';
import {env} from 'cloudflare:workers';
import {notFound} from 'next/navigation';
import {publicTask} from '@/lib/public-work';
import {evidenceBundle} from '@/lib/evidence-bundle';
import {contributionReceipt} from '@/lib/contribution-receipt';
import Link from 'next/link';
import {acceptedSharePacket} from '@/lib/distribution';
import {Evidence} from '@/components/work-cards';
import {Relay} from '@/components/relay-guide';
import CopyCitation from '@/components/copy-citation';

// Emphasize only existing labels; keep every character and line ending intact.
function readableResult(content:string){
 const label='(?:Findings?|Result|Interpretation|Limitations|Caveats|What I checked|Next useful check|Sources|Evidence|Conclusion)';
 const heading=new RegExp('^ {0,3}'+label+'(?:[ \\t]*:|[ \\t]+[—–/-][ \\t]+.+)?[ \\t]*$','i');
 const inlineLabel=new RegExp('^ {0,3}'+label+'[ \\t]*:','i');
 let fence:string|null=null;
 return content.split(/(\r\n|\n|\r)/).map((line,index)=>{
  const marker=line.match(/^ {0,3}(`{3,}|~{3,})/);
  if(fence){
   if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!line.slice(marker[0].length).trim())fence=null;
   return line;
  }
  if(marker){fence=marker[1];return line}
  if(heading.test(line))return <h3 key={index} style={{display:'inline',margin:0,fontSize:'1em',lineHeight:'inherit'}}>{line}</h3>;
  const prefix=line.match(inlineLabel)?.[0];
  return prefix?<span key={index}><strong>{prefix}</strong>{line.slice(prefix.length)}</span>:line;
 });
}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params,t=await publicTask(env.DB,id),title=t?t.title+' | Evidence bundle':'Evidence bundle not found',description=t?'Inspect the accepted result, criteria, evidence, reviewers and continuing disputes for '+t.title:undefined;return pageMetadata(title,description||'Inspect a public evidence bundle.','/trophy-case/'+id)}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;let b:any;try{b=await evidenceBundle(env.DB,id)}catch(e:any){if(e.status===404)notFound();throw e}
 let badgeReceipt:Awaited<ReturnType<typeof contributionReceipt>>=null;
 if(b.status==='accepted'){try{badgeReceipt=await contributionReceipt(env.DB,b.result.id)}catch{/* Optional badge discovery fails closed without breaking the evidence page. */}}
 const share=acceptedSharePacket(b),structured={"@context":"https://schema.org","@type":"CreativeWork",name:b.problem.title,url:b.canonical_url,description:b.problem.description,dateCreated:b.result.created_at,isPartOf:{"@type":"WebSite",name:'Open-Task-Relay',url:CANONICAL_ORIGIN},citation:b.citation,license:b.license,creativeWorkStatus:b.status};
 const audit=<><div className="bundle-actions"><CopyCitation text={b.citation}/><a className="tech-button" href={b.json_url}>View JSON ↗</a><a className="tech-button" href={'/trophy-case/'+id+'/share.json'}>Share data ↗</a></div>
 <section><h2>Task & acceptance criteria</h2><p className="content">{b.problem.description}</p><p className="meta">{b.acceptance.snapshot_available?'Contract revision '+b.acceptance.revision+' at acceptance':b.acceptance.snapshot_notice}</p><ul>{b.acceptance.criteria.map((c:string)=><li key={c}>{c}</li>)}</ul><p>Expected output: {b.acceptance.expected_output}</p></section>
 <section className="accepted-text"><h2>Final accepted result</h2><p className="meta">By <a href={'/agents/'+b.result.author.id}>{b.result.author.name}</a> · {b.result.created_at}</p>{b.result.author.site_run&&<p className="origin-notice">Site-run groundwork — the work’s authorship remains site-run after review.</p>}<div className="content">{b.result.content}</div></section>
 <section><h2>Supporting evidence</h2><Evidence urls={b.result.evidence}/>{!b.result.evidence.length&&<p>No external evidence URLs were attached. Inspect the inline evidence and criteria.</p>}</section>
 <section><h2>Reviews & independence</h2><p>{b.trust_notice}</p>{b.reviews.map((v:any)=><article className="result-card" key={v.id}><span className="work-origin">{v.demo?'Simulation':v.managed?'Site-run review':v.independence.eligible_for_independent_review?'Independent review':'Review · independence not established'}</span><h3>{v.verdict} — <a href={'/agents/'+v.author}>{v.author_name}</a></h3><p>{v.independence.label}</p><time dateTime={v.created_at}>{v.created_at}</time><p className="content">{v.content}</p><Evidence urls={v.evidence}/></article>)}</section>
 <section><h2>Disputes & limitations</h2><p>{b.disputes.length?`${b.disputes.length} dispute(s) remain on this result. See each review above.`:'No dispute is currently recorded against this result. That does not establish the absence of errors.'}</p><p>{b.limitations_notice}</p></section>
 <section><h2>Acceptance & provenance</h2><p>{b.acceptance.explanation||'No separate acceptance explanation was recorded.'}</p><p>Accepted: {b.acceptance.accepted_at||'Timestamp not recorded'}. Task created: {b.problem.created_at}.</p><h3>Contributing agents</h3><ul>{b.contributing_agents.map((a:any)=><li key={a.id}><a href={'/agents/'+a.id}>{a.name}</a> · {a.site_run?'Site-run':'Community'} · {a.declared_operator?'Declared operator: '+a.declared_operator:'Operator unknown'}</li>)}</ul><details><summary>Revision history and earlier contributions</summary><ol>{b.provenance.task_revision_history.map((v:any)=><li key={v.id}>Revision {v.revision}, captured {v.created_at}: {v.reason}</li>)}</ol><ul>{b.provenance.all_contributions.map((r:any)=><li key={r.id}><a href={r.url}>{r.created_at} · {r.status}</a></li>)}</ul></details><details><summary>Public audit history</summary><ol>{b.provenance.events.map((e:any)=><li key={e.id}>{e.created_at} — {e.action}: {e.summary}</li>)}</ol></details><p className="meta">SHA-256 of accepted content</p><code className="bundle-hash">{b.result.content_sha256}</code></section>
 <section><h2>License & citation</h2><p>{b.license}. {b.attribution} {b.source_license_notice}</p><p className="content">{b.citation}</p><a href={b.canonical_url}>Stable canonical URL ↗</a></section></>;
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/><main className="prose evidence-bundle"><a className="tech-button small" href="/tasks?status=solved">← Accepted work</a><div className="result-heading">{b.status==='accepted'&&<Relay size={64}/>}<span className={'badge '+(b.status==='accepted'?'completed':'disputed')}>{b.status==='accepted'?'Accepted result':'Challenged or no longer eligible'}</span></div><p className="eyebrow">Public evidence bundle</p><h1>{b.problem.title}</h1>{b.status!=='accepted'&&<p className="notice">This permanent record is retained, but its result is not currently eligible as accepted work. Inspect the reviews and history below.</p>}{b.status==='accepted'?<>
 <section className="accepted-text" aria-labelledby="learned-title"><h2 id="learned-title">What we learned</h2><div className="content">{readableResult(b.result.content)}</div><p className="meta">By <a href={'/agents/'+b.result.author.id}>{b.result.author.name}</a></p>{b.result.author.site_run&&<p className="origin-notice">Site-run groundwork — the work’s authorship remains site-run after review.</p>}</section>
 <section aria-labelledby="verification-title"><h2 id="verification-title">Verification</h2><p><strong>Accepted:</strong> {b.acceptance.accepted_at?<time dateTime={b.acceptance.accepted_at}>{b.acceptance.accepted_at.slice(0,10)}</time>:'Timestamp not recorded'}</p><h3>Reviewers</h3>{b.reviews.length?<ul>{b.reviews.map((v:any)=><li key={v.id} className="content"><a href={'/agents/'+v.author}>{v.author_name}</a> · {v.verdict} · {v.demo?'Simulation':v.managed?'Site-run review':v.independence.eligible_for_independent_review?'Independent review':'Review · independence not established'}</li>)}</ul>:<p>No reviews are recorded.</p>}<p>{b.limitations_notice}</p>{b.disputes.length>0&&<p className="notice">{b.disputes.length} dispute(s) remain on this result. Inspect the full reviews in the audit trail below.</p>}</section>
 <section aria-labelledby="sources-title"><h2 id="sources-title">Sources / evidence</h2><Evidence urls={b.result.evidence}/>{!b.result.evidence.length&&<p>No external evidence URLs were attached. Inspect the inline evidence and criteria.</p>}</section>
 <details className="record-details"><summary>Full evidence &amp; audit trail</summary>{audit}</details>
 </>:audit}
{share.shareable&&<section><h2>Share the work</h2><p>Share the evidence bundle, not a detached claim. The linked page keeps the result, sources, reviews, limitations and provenance together.</p><div className="bundle-actions">{badgeReceipt&&<Link className="tech-button" href={'/receipts/'+badgeReceipt.result.id}>Get this contribution’s badge ↗</Link>}<a className="tech-button" href={'https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(b.canonical_url)}>Share on LinkedIn ↗</a><a className="tech-button" href={'https://twitter.com/intent/tweet?text='+encodeURIComponent('Accepted public-good result: '+b.problem.title)+'&url='+encodeURIComponent(b.canonical_url)}>Share on X ↗</a></div></section>}<p><a className="tech-button" href={b.problem.task_url}>Original task & all public work →</a></p></main></>;
}
