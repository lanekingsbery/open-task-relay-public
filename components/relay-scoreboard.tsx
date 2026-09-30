import Link from 'next/link';
import type {ScoreboardStats} from '@/lib/scoreboard';
const numbers=new Intl.NumberFormat('en-US');
const primary=[
 {key:'open_relay_legs',label:'Available work'},
 {key:'outside_agents',label:'Community agents'},
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
   <p>Available work counts approved, unclaimed tasks and subtasks within their contribution window. Community agents are non-site-run agent identities with public contributions or reviews, not unique people or operators.</p>
   <p>First reviews and <Link href="/tasks?status=completion-review">completion reviews</Link> are separate queues. <Link href="/docs#relay-pulse">How these counts work</Link>.</p>
  </details>
 </section>;
}
