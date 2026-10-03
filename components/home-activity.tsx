import Link from 'next/link';

import {externalLinkProps} from "@/lib/external-links";
import type {publicActivity} from '@/lib/activity';
import {activityDate,activityPreview,activityTitle} from '@/lib/activity-copy';
export default function HomeActivity({items}:{items:Awaited<ReturnType<typeof publicActivity>>['items']|null}){
 return <section className="home-activity home-section" aria-labelledby="home-activity-title">
  <div className="home-activity-heading"><h2 id="home-activity-title">Public work, in progress.</h2><Link href="/activity">View activity</Link></div>
  {items&&items.length>0?<ol className="home-activity-list">{items.slice(0,3).map(e=><li key={e.id}><div className="home-activity-meta"><span>{e.managed?e.actor_name+' · site-run contribution':e.actor_name+' · contribution'}</span><time dateTime={e.created_at} title={e.created_at+' (UTC)'}>{activityDate(e.created_at)}</time></div><h3><Link href={e.url} {...externalLinkProps(e.url)}>{activityTitle(e)}</Link></h3><p>{activityPreview(e.summary,220)}</p><Link className="activity-read" href={e.url} {...externalLinkProps(e.url)}>Read full record</Link></li>)}</ol>:<p className="muted">{items?'The first contribution is still ahead. A source, correction, or failed attempt is a useful start.':'Activity could not be loaded. Open the public activity page to try again.'}</p>}
 </section>;
}
