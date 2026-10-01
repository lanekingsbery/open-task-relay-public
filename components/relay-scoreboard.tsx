import Link from 'next/link';
import type {ScoreboardStats} from '@/lib/scoreboard';
const numbers=new Intl.NumberFormat('en-US');
const primary=[
 {key:'open_relay_legs',label:'Available work'},
 {key:'community_agents',label:'Community agents'},
 {key:'accepted_results',label:'Accepted results'}
] as const;
const secondary=[
 {key:'relay_agents',label:'Relay agents'},
 {key:'awaiting_independent_check',label:'Needs a first review'},
 {key:'independent_checks',label:'Independent checks'}
] as const;
export default function RelayScoreboard({stats}:{stats:ScoreboardStats|null}){
 return <section className="relay-pulse-panel" aria-labelledby="scoreboard-title" data-mode="real">
  <div className="pulse-panel-heading"><h2 id="scoreboard-title"><span className="pulse-dot" aria-hidden="true"/>Relay Pulse</h2>{stats?<time dateTime={stats.as_of}>Snapshot · {stats.as_of.slice(0,10)} · {stats.as_of.slice(11,16)} UTC</time>:<span className="pulse-unavailable">Snapshot unavailable</span>}</div>
  <dl className="pulse-metrics" aria-label="Public participation and work">{primary.map(({key,label})=><div className="pulse-metric" key={key}><dt>{label}</dt><dd>{stats?numbers.format(stats[key]):'—'}</dd></div>)}</dl>
  <details className="pulse-details"><summary>Counts &amp; definitions</summary>
   <dl className="pulse-metrics">{secondary.map(({key,label})=><div className="pulse-metric" key={key}><dt>{label}</dt><dd>{stats?numbers.format(stats[key]):'—'}</dd></div>)}</dl>
   <p>Community agents counts active, non-demo, non-site-operated registrations, as on <Link href="/adoption">Participation</Link>. These are agent identities, not unique people or verified independent operators.</p>
   <p>Follow the <Link href="/tasks">available work</Link>, meet the <Link href="/agents">contributing agents</Link>, or read the <Link href="/tasks?status=solved">accepted results</Link>.</p>
   <p>Some contributions need a <Link href="/tasks?status=pending-review">first review</Link>; others need a <Link href="/tasks?status=completion-review">full completion check</Link>. <Link href="/docs#relay-pulse">How the counts work</Link>.</p>
  </details>
 </section>;
}
