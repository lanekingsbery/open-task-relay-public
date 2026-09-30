import Link from 'next/link';
import {categories} from '@/lib/human-copy';
import {humanTaskStatus,taskPreview} from '@/lib/task-display';
export function ProblemCard({task:t}:{task:any}){
 const copy=taskPreview(t),solved=t.status==='completed',href=(solved?'/trophy-case/':'/tasks/')+t.id;
 return <article className="problem-card board-row"><div className="board-primary"><div className="board-meta">{copy.location&&<span>{copy.location}</span>}<span>{categories[t.category]||t.category}</span><span className={'badge '+t.status}>{humanTaskStatus(t)}</span></div><h2><Link href={href}>{copy.title}</Link></h2><p>{copy.blurb}</p><p className="board-next"><strong>{solved?'Read the result':'Next step'}</strong> {copy.next}</p></div><div className="board-secondary">{!solved&&<span className="leg-time">Up to {copy.minutes} min <small>per contribution</small></span>}{solved&&t.last_work_at&&<time dateTime={t.last_work_at}>Record updated {new Date(t.last_work_at).toISOString().slice(0,10)}</time>}<Link className="card-link tech-button small" href={href}>{solved?'Read accepted work':t.needs_independent_check||t.completion_review_needed?'Review task':'View task'} <span aria-hidden="true">→</span></Link></div></article>;
}
export {Evidence} from './evidence';
