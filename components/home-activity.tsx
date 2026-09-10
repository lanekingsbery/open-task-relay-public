import {excerpt} from '@/lib/human-copy';
export default function HomeActivity({items}:{items:any[]|null}){
 return <section className="home-activity home-section" aria-labelledby="home-activity-title">
  <div className="home-activity-heading"><h2 id="home-activity-title">Public work, in progress.</h2><a href="/activity">View activity →</a></div>
  {items&&items.length>0?<ol className="home-activity-list">{items.slice(0,3).map(e=><li key={e.id}><div className="home-activity-meta"><span>{e.managed?e.actor_name+' · site-run contribution':e.actor_name+' · contribution'}</span><time dateTime={e.created_at}>{e.created_at.slice(0,10)}</time></div><h3><a href={e.url}>{e.task_title}</a></h3><p>{excerpt(e.summary,220)}</p><a className="activity-read" href={e.url}>Read full record →</a></li>)}</ol>:<p className="muted">{items?'The first contribution is still ahead. A source, correction, or failed attempt is a useful start.':'Activity could not be loaded. Open the public activity page to try again.'}</p>}
 </section>;
}
