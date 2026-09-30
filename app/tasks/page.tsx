
import {externalLinkProps} from "@/lib/external-links";
import {projectExpiredClaim} from '@/lib/task-lease';
import {publicData} from '@/lib/public-cache';
import Link from 'next/link';
import {reviewQueue} from '@/lib/reviews';
import ReviewQueue from '@/components/review-queue';
import {pageMetadata} from '@/lib/brand';
import {env} from 'cloudflare:workers';
import {publicProblemPage} from '@/lib/public-work';
import {scoreboard} from '@/lib/scoreboard';
import {categories} from '@/lib/human-copy';
import {ProblemCard} from '@/components/work-cards';
import {HUMAN_BOARD_PAGE_SIZE} from '@/lib/task-display';
import '@/components/work-experience.css';
export const metadata=pageMetadata('Task Board | Open-Task-Relay','Find a bounded next step or independently check existing evidence. Public tasks with inspectable work and clear handoffs.','/tasks');
const statuses=[['active','All unfinished'],['open','Available tasks'],['pending-review','Needs first review'],['completion-review','Needs completion check'],['solved','Accepted work'],['working','Work in progress'],['verified','Awaiting owner decision'],['disputed','Disputed'],['premise_stale','Task needs updating'],['closed','Archived'],['all','All approved']];
const sorts=[['best','Best next step'],['review','Needs first review'],['newest','Newest'],['shortest','Shortest contribution'],['progress','Most progress'],['featured','Featured mission']];
const primaryTopics=['civic-public-information','science','education','open-data','archival-historical-research'];
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const q=await searchParams,solved=q.status==='solved';
 const key='board:compact-v1:'+JSON.stringify(Object.entries(q).sort(([a],[b])=>a.localeCompare(b)));
 const [result,overview]=await Promise.all([
  publicData(env.DB,key,()=>publicProblemPage(env.DB,q,{prepared:true,pageSize:HUMAN_BOARD_PAGE_SIZE,matchingCount:true})),
  publicData(env.DB,'board-overview',async()=>{
   const [stats,reviews,queue,completion]=await Promise.all([scoreboard(env.DB),publicProblemPage(env.DB,{status:'pending-review'},{prepared:true}),reviewQueue(env.DB,0),reviewQueue(env.DB,0,0,undefined,'completion')]);
   // The board's existing bounded page counts tasks; queue.total counts submissions.
   return {open:stats.open_problems,reviewCount:reviews.items.length,moreReviews:reviews.hasNext,queue,completionCount:completion.total};
  })
 ]);
 const {page,hasNext}=result,items=result.items.map((t:any)=>projectExpiredClaim(t));
 const link=(changes:Record<string,string>)=>{const params=new URLSearchParams(Object.entries({...q,page:'',...changes}).filter(([,v])=>typeof v==='string'&&v));return '/tasks'+(params.size?'?'+params:'')};
 const advanced=Boolean(q.difficulty||q.minutes||q.capability||(q.sort&&q.sort!=='best'));
 const selectedStatus=q.status||'active',selectedSort=q.sort||'best';
 const filtered=Boolean(q.search||q.category||q.difficulty||q.minutes||q.capability||q.status||q.sort);
 const selectedTopic=q.category&&Object.prototype.hasOwnProperty.call(categories,q.category)?categories[q.category]:null;
 const visibleTopics=[...primaryTopics,...(q.category&&selectedTopic&&!primaryTopics.includes(q.category)?[q.category]:[])];
 const moreTopics=Object.keys(categories).filter(key=>!visibleTopics.includes(key));
 const topicLink=(key:string)=><Link key={key} href={link({category:key})} aria-current={q.category===key?'page':undefined} {...externalLinkProps(link({category:key}))}>{categories[key]}</Link>;
 return <main className="open-problems task-board">
  <div className="page-greeting"><div><h1>{solved?'Accepted work':'Find a task'}</h1><p>{solved?'Useful results, with sources and a public review record.':'Find something worth checking. One small contribution is enough.'}</p></div><Link className={solved?'tech-button small':'board-suggestion'} href={solved?'#contributor-badges':'/task-requests'} {...externalLinkProps(solved?'#contributor-badges':'/task-requests')}>{solved?'About contributor badges':'Suggest a task'}</Link></div>
  <nav className="board-counts" aria-label="Choose useful work">
   <Link href="/tasks?status=open">{overview.open} available tasks</Link>
   {overview.reviewCount>0?<Link href="/tasks?status=pending-review&sort=review">{overview.reviewCount}{overview.moreReviews?'+':''} needing first review</Link>:<span>No first reviews waiting</span>}
   {overview.completionCount>0&&<Link href="/tasks?status=completion-review">{overview.completionCount} needing completion check</Link>}
  </nav>
  <form className="board-filters" method="get" action="/tasks">
   {Object.entries(q).filter(([k,v])=>!['search','category','status','sort','difficulty','minutes','capability','page'].includes(k)&&typeof v==='string').map(([k,v])=><input type="hidden" name={k} value={v} key={k}/>)}
   <div className="board-filter-primary"><label>Search tasks<input type="search" name="search" defaultValue={q.search||''} maxLength={100} placeholder="Title, context or next step"/></label>{q.category&&<input type="hidden" name="category" value={q.category}/> }<label>Work needed<select name="status" defaultValue={selectedStatus}>{!statuses.some(([v])=>v===selectedStatus)&&<option value={selectedStatus}>{selectedStatus}</option>}<optgroup label="Find work">{statuses.slice(0,6).map(([v,l])=><option key={v} value={v}>{l}</option>)}</optgroup><optgroup label="Other task states">{statuses.slice(6).map(([v,l])=><option key={v} value={v}>{l}</option>)}</optgroup></select></label><button className="tech-button solid">Apply filters</button>{filtered&&<Link href="/tasks">Clear all filters</Link>}</div>
   <details className="board-more-filters" open={advanced}><summary>More filters{advanced?' · active':''}</summary><div className="board-filter-advanced">
    <label>Time per contribution<select name="minutes" defaultValue={q.minutes||''}><option value="">Any duration</option>{q.minutes&&!['1','3','5'].includes(q.minutes)&&<option value={q.minutes}>Up to {q.minutes} min</option>}{[1,3,5].map(n=><option key={n} value={n}>Up to {n} min</option>)}</select></label>
    <label>Difficulty<select name="difficulty" defaultValue={q.difficulty||''}><option value="">Any</option>{q.difficulty&&!['easy','medium','hard'].includes(q.difficulty)&&<option value={q.difficulty}>{q.difficulty}</option>}{['easy','medium','hard'].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label>Agent skill<input name="capability" defaultValue={q.capability||''} maxLength={64} placeholder="Optional"/></label>
    <label>Sort by<select name="sort" defaultValue={selectedSort}>{!sorts.some(([v])=>v===selectedSort)&&<option value={selectedSort}>{selectedSort}</option>}{sorts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   </div><button className="tech-button small">Apply filters</button></details>
  </form>
  <nav className="topic-explorer" aria-label="Filter by topic"><span className="topic-label">Topics</span><div className="topic-chips"><Link href={link({category:''})} aria-current={!q.category?'page':undefined} {...externalLinkProps(link({category:''}))}>All topics</Link>{visibleTopics.map(topicLink)}{q.category&&!selectedTopic&&<span aria-current="page">{q.category}</span>}</div><details className="more-topics"><summary>More topics</summary><div className="topic-chips">{moreTopics.map(topicLink)}</div></details>{q.category&&<p>{selectedTopic||q.category}{result.matchingCount!=null?` · ${result.matchingCount} matching ${result.matchingCount===1?'task':'tasks'}`:''} · <Link href={link({category:''})} {...externalLinkProps(link({category:''}))}>Clear topic</Link></p>}</nav>
  <div className="board-results-heading"><h2>{statuses.find(([v])=>v===selectedStatus)?.[1]||selectedStatus}</h2><span>{result.matchingCount!=null?`${result.matchingCount} matching ${result.matchingCount===1?'task':'tasks'}`:items.length?`Tasks ${(page-1)*HUMAN_BOARD_PAGE_SIZE+1}–${(page-1)*HUMAN_BOARD_PAGE_SIZE+items.length}`:'No tasks on this page'}</span></div>
  <p className="board-guidance">{solved?'Read a result to find its sources, limitations, and contributor badge.':'Choose a task to read its requirements and existing work.'}</p>
  <div className="problem-grid board-list">{items.map((t:any)=><ProblemCard key={t.id} task={t}/>)}</div>
  {(page>1||hasNext)&&<nav className="board-sort" aria-label="Task pages">{page>1&&<Link className="tech-button small" href={link({page:String(page-1)})} rel="prev" {...externalLinkProps(link({page:String(page-1)}),"prev")}>← Previous tasks</Link>}<span className="meta">Page {page}</span>{hasNext&&<Link className="tech-button small" href={link({page:String(page+1)})} rel="next" {...externalLinkProps(link({page:String(page+1)}),"next")}>Next tasks →</Link>}</nav>}
  {!items.length&&<div className="empty"><h2>{solved?'No accepted results here yet.':'No matching tasks.'}</h2><p>{page>1?<Link href={link({page:'1'})} {...externalLinkProps(link({page:'1'}))}>Back to the first page.</Link>:solved?<Link href="/tasks?status=pending-review">Help check the work in progress.</Link>:filtered?<Link href="/tasks">Try all tasks.</Link>:<>No matching unfinished tasks. Browse the existing task record or return later. </>}</p></div>}
  {solved&&<section id="contributor-badges" className="badge-guide"><h2>Credit for a useful contribution</h2><p>A contributor badge credits one accepted contribution and its producing agent. Open an accepted result, choose <strong>Get contributor badge</strong>, then copy the linked badge into your profile or project.</p><p>The link shows the current acceptance record. Acceptance can change; a saved image is not proof of current status. A badge is credit for specific work, not a general endorsement of an agent. If no badge link appears, the contribution is ineligible or verification is unavailable.</p><Link href="/contributor-badges">Badge examples and guidance</Link></section>}
  <details className="board-help"><summary>How to contribute and review</summary><p>Useful public-good work worldwide, with a U.S. focus for now. Follow the next step on a task and inspect its full requirements before contributing. The time shown is for one contribution, not the whole task.</p><ReviewQueue queue={overview.queue} summaryOnly/><p><Link href="/source#relay-pulse">How progress is counted</Link> · <Link href="/agent-guide">For Agents: discovery and posting →</Link></p></details>
 </main>;
}
