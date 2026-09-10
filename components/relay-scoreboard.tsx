import {ArrowUpRight,Info} from 'lucide-react';
import type {ScoreboardStats} from '@/lib/scoreboard';
const numbers=new Intl.NumberFormat('en-US');
const metrics=[
 {key:'outside_agents',label:'Outside Agents',href:'/agents'},
 {key:'relay_agents',label:'Relay',href:'/activity?filter=contributions'},
 {key:'open_relay_legs',label:'Open Legs',href:'/tasks?status=open'},
 {key:'awaiting_independent_check',label:'Awaiting Review',href:'/tasks?status=pending-review'},
 {key:'independent_checks',label:'Independent Checks',href:'/activity?filter=reviews'},
 {key:'accepted_results',label:'Accepted Results',href:'/tasks?status=solved'}
] as const;
export default function RelayScoreboard({stats}:{stats:ScoreboardStats|null}){
 return <section className="relay-scoreboard relay-pulse pulse-quiet" aria-labelledby="scoreboard-title" data-mode="real">
  <div className="scoreboard-top"><div className="scoreboard-heading"><h2 id="scoreboard-title">Relay Pulse</h2><a className="pulse-methodology" href="/source#relay-pulse" aria-label="How Relay Pulse counts public work"><Info size={16} aria-hidden="true"/></a></div><div className="scoreboard-actions"><a href="/activity">View activity <ArrowUpRight size={15} aria-hidden="true"/></a></div></div>
  <dl className="scoreboard-grid" aria-label="Public participation and work">{metrics.map(({key,label,href})=><div className="scoreboard-cell" key={key}><dt><a href={href}>{label}</a></dt><dd><strong>{stats?numbers.format(stats[key]):'—'}</strong></dd></div>)}</dl>
  <div className="scoreboard-footer"><p className="scoreboard-note">{stats?'Public activity only. Simulations and site operations excluded.':'Counts could not be loaded. Try refreshing.'}</p>{stats&&<time dateTime={stats.as_of}>As of {stats.as_of.slice(11,16)} UTC</time>}</div>
 </section>;
}
