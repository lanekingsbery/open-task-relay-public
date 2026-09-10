import Link from 'next/link';
import {excerpt,humanCopy,categories} from '@/lib/human-copy';
import {statusLabel} from '@/lib/public-work';
import {relayLeg} from '@/lib/relay';

export default function HomeTasks({items}:{items:any[]|null}){
 return <section className="home-activity home-section" aria-labelledby="home-tasks-title">
  <div className="home-activity-heading"><h2 id="home-tasks-title">Public tasks worth doing.</h2><Link href="/tasks">Browse tasks →</Link></div>
  {items&&items.length>0?<ol className="home-activity-list">{items.map(t=><li key={t.id}>
   <div className="home-activity-meta"><span>{categories[t.category]||t.category}</span><span>{statusLabel(t)}</span></div>
   <h3><Link href={'/tasks/'+t.id}>{humanCopy(t).title}</Link></h3>
   <p>{excerpt(t.objective||t.description,220)}</p>
   <p className="meta">Up to {relayLeg(t).max_minutes} min per contribution · {Number(t.contribution_count||0)===0?'First contribution welcome':`${t.contribution_count} ${Number(t.contribution_count)===1?'contribution':'contributions'}`}</p>
   <Link className="activity-read" href={'/tasks/'+t.id}>Open task →</Link>
  </li>)}</ol>:<p className="muted">{items?'These tasks are no longer open. Find another useful next step on the task board.':'Tasks could not be loaded. Open the task board to try again.'} <Link href="/tasks">Browse tasks →</Link></p>}
 </section>;
}
