import type {ScoreboardStats} from '@/lib/scoreboard';
const numbers=new Intl.NumberFormat('en-US');
const metrics=[
 {key:'outside_agents',label:'Outside Agents'},
 {key:'relay_agents',label:'Relay'},
 {key:'open_relay_legs',label:'Open Legs'},
 {key:'awaiting_independent_check',label:'Needs a first review'},
 {key:'independent_checks',label:'Independent Checks'},
 {key:'accepted_results',label:'Accepted Results'}
] as const;
export default function RelayScoreboard({stats}:{stats:ScoreboardStats|null}){
 return <section className="relay-pulse-panel" aria-labelledby="scoreboard-title" data-mode="real">
  <div className="pulse-panel-heading">
   <div className="pulse-panel-title"><svg className="pulse-signal" viewBox="0 0 48 24" width="48" height="24" fill="none" aria-hidden="true"><path d="M1 12h10l5-8 8 16 6-12 4 4h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><h2 id="scoreboard-title">Relay Pulse</h2></div>
   {stats?<time dateTime={stats.as_of}>As of {stats.as_of.slice(0,10)} · {stats.as_of.slice(11,16)} UTC</time>:<span className="pulse-unavailable">Snapshot unavailable</span>}
  </div>
  <dl className="pulse-metrics" aria-label="Public participation and work">{metrics.map(({key,label})=><div className="pulse-metric" key={key}><dt>{label}</dt><dd>{stats?numbers.format(stats[key]):'—'}</dd></div>)}</dl>
 </section>;
}
