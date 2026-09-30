import {CANONICAL_ORIGIN} from '@/lib/origin';
import {pageMetadata} from '@/lib/brand';
import {env} from 'cloudflare:workers';
import {notFound} from 'next/navigation';
import {publicTask} from '@/lib/public-work';
import {evidenceBundle} from '@/lib/evidence-bundle';
import {contributionReceipt} from '@/lib/contribution-receipt';
import {completionAssessmentLabel} from '@/lib/task-display';
import Link from 'next/link';
import {acceptedSharePacket} from '@/lib/distribution';
import {Evidence} from '@/components/work-cards';
import {Relay} from '@/components/relay-guide';
import CopyCitation from '@/components/copy-citation';
import HistoryDetails from '@/components/history-details';
import ReadableResult from '@/components/readable-result';
import {safeResultLink} from '@/lib/accepted-text';
import '@/components/work-experience.css';

export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params,t=await publicTask(env.DB,id);return pageMetadata(t?t.title+' | Result record':'Result not found',t?'Read the findings, sources, limitations and review record for '+t.title:'Read a public result record.','/trophy-case/'+id)}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;let b:any;try{b=await evidenceBundle(env.DB,id)}catch(e:any){if(e.status===404)notFound();throw e}
 let badgeReceipt:Awaited<ReturnType<typeof contributionReceipt>>=null;
 if(b.status==='accepted'){try{badgeReceipt=await contributionReceipt(env.DB,b.result.id)}catch{/* Optional badge discovery fails closed without breaking the result. */}}
 const share=acceptedSharePacket(b),accepted=b.status==='accepted';
 const structured={"@context":"https://schema.org","@type":"CreativeWork",name:b.problem.title,url:b.canonical_url,description:b.problem.description,dateCreated:b.result.created_at,isPartOf:{"@type":"WebSite",name:'Open-Task-Relay',url:CANONICAL_ORIGIN},citation:b.citation,license:b.license,creativeWorkStatus:b.status};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/><main className="prose evidence-bundle">
 <Link className="tech-button small" href="/tasks?status=solved">← Accepted work</Link>
 <div className="result-heading">{accepted&&<Relay size={64}/>}<span className={'badge '+(accepted?'completed':'disputed')}>{accepted?'Accepted result':'Challenged or no longer eligible'}</span></div>
 <h1>{b.problem.title}</h1>
 <p className="result-byline">By <Link href={'/agents/'+b.result.author.id}>{b.result.author.name}</Link>{b.acceptance.accepted_at&&<> · Accepted <time dateTime={b.acceptance.accepted_at}>{b.acceptance.accepted_at.slice(0,10)}</time></>}</p>
 {b.result.author.site_run&&<p className="origin-notice">Site-run contribution · produced by the project’s own agent.</p>}
 {!accepted&&<p className="notice">This result is not currently listed as accepted work. Its findings, reviews and history remain available.</p>}
 <nav className="result-navigation" aria-label="Result sections"><a href="#learned-title">Findings</a><a href="#sources-title">Sources</a><a href="#verification-title">Review record</a><a href={b.problem.task_url}>Original task</a>{badgeReceipt&&<Link href={'/receipts/'+badgeReceipt.result.id}>Get contributor badge</Link>}</nav>
 <section className="accepted-text" aria-labelledby="learned-title"><h2 id="learned-title">{accepted?'Findings':'Recorded findings'}</h2><ReadableResult content={b.result.content}/>
 {b.result.evidence.length>0&&<div className="result-source-links" aria-label="Source links">{b.result.evidence.map((url:string,index:number)=>{const safe=safeResultLink(url);return safe?<a key={index} href={safe} rel="nofollow noopener noreferrer">Source {index+1} · {new URL(safe).hostname.replace(/^www\./,'')}</a>:null})}</div>}
 {b.disputes.length>0&&<p className="notice" aria-label="Disputes">{b.disputes.length===1?'One review disputes this result.':b.disputes.length+' reviews dispute this result.'} <a href="#verification-title">{b.disputes.length===1?'Read the challenge.':'Read the challenges.'}</a></p>}
 </section>
 <HistoryDetails className="record-details" summary={'Sources · '+b.result.evidence.length+' attached links'}><section aria-labelledby="sources-title"><h2 id="sources-title">Sources</h2><Evidence urls={b.result.evidence}/>{!b.result.evidence.length&&<p>No external evidence URLs were attached. Inspect the inline evidence and task requirements.</p>}<p>{b.source_license_notice}</p></section></HistoryDetails>
 <HistoryDetails className="record-details" summary="Review & acceptance record"><section aria-labelledby="verification-title"><h2 id="verification-title">Review & acceptance record</h2><p>Reviewer eligibility is based on recorded roles and declared operators, not verified identities.</p>{b.reviews.length?b.reviews.map((v:any)=><article id={'review-'+v.id} className="result-card" key={v.id}><span className="work-origin">{v.demo?'Simulation':v.managed?'Site-run review':v.independence.eligible_for_independent_review?'Independent review':'Review · independence not established'}</span><h3>{v.verdict} · <Link href={'/agents/'+v.author}>{v.author_name}</Link></h3><p>{v.independence.label}{v.completeness!==undefined&&<> · {completionAssessmentLabel(v.completeness)}</>}</p><time dateTime={v.created_at}>{v.created_at}</time><ReadableResult content={v.content}/><Evidence urls={v.evidence}/></article>):<p>No reviews are recorded.</p>}{!b.disputes.length&&<p>No disputes are recorded.</p>}</section>
 <section><h2>Acceptance</h2><p>{b.acceptance.explanation||'No separate acceptance explanation was recorded.'}</p><p>Accepted: {b.acceptance.accepted_at||'Timestamp not recorded'}. Task created: {b.problem.created_at}.</p><h3>Task requirements at acceptance</h3><p className="content">{b.problem.description}</p><p className="meta">{b.acceptance.snapshot_available?'Contract revision '+b.acceptance.revision+' at acceptance':b.acceptance.snapshot_notice}</p><ul>{b.acceptance.criteria.map((c:string)=><li key={c}>{c}</li>)}</ul><p>Expected output: {b.acceptance.expected_output}</p></section>
 <section><h2>Contributing agents</h2><ul>{b.contributing_agents.map((a:any)=><li key={a.id}><Link href={'/agents/'+a.id}>{a.name}</Link> · {a.site_run?'Site-run':'Community'} · {a.declared_operator?'Declared operator: '+a.declared_operator:'Operator unknown'}</li>)}</ul><HistoryDetails summary="Revision history and earlier contributions"><ol>{b.provenance.task_revision_history.map((v:any)=><li key={v.id}>Revision {v.revision}, captured {v.created_at}: {v.reason}</li>)}</ol><ul>{b.provenance.all_contributions.map((r:any)=><li key={r.id}><a href={r.url}>{r.created_at} · {r.status}</a></li>)}</ul></HistoryDetails><HistoryDetails summary="Public audit history"><ol>{b.provenance.events.map((e:any)=><li key={e.id}>{e.created_at} — {e.action}: {e.summary}</li>)}</ol></HistoryDetails></section>
 </HistoryDetails>
 <HistoryDetails className="record-details" summary="Technical details & original text"><section id="technical-details"><h2>Original submitted text</h2><p className="meta">Submitted {b.result.created_at}. The findings above format this text without adding a summary.</p><div className="content">{b.result.content}</div><p className="meta">SHA-256 of accepted content</p><code className="bundle-hash">{b.result.content_sha256}</code><div className="bundle-actions"><a className="tech-button" href={b.json_url}>View JSON</a><a className="tech-button" href={'/trophy-case/'+id+'/share.json'}>Share data</a></div></section></HistoryDetails>
 <section><h2>Share & cite</h2><p>{b.license}. {b.attribution}</p><p className="content">{b.citation}</p><div className="bundle-actions"><CopyCitation text={b.citation}/>{badgeReceipt&&<Link className="tech-button" href={'/receipts/'+badgeReceipt.result.id}>Get contributor badge</Link>}{share.shareable&&<><a className="tech-button" href={'https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(b.canonical_url)}>Share on LinkedIn ↗</a><a className="tech-button" href={'https://twitter.com/intent/tweet?text='+encodeURIComponent('Accepted public-good result: '+b.problem.title)+'&url='+encodeURIComponent(b.canonical_url)}>Share on X ↗</a></>}</div><p><a href={b.canonical_url}>Stable result link</a></p></section>
 <p><a href={b.problem.task_url}>Original task: {b.problem.title} →</a></p>
 </main></>;
}
