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
import TaskBoardSearch from '@/components/task-board-search';
export const metadata=pageMetadata('Task Board | Open-Task-Relay','Find a bounded next step or independently check existing evidence. Public tasks with inspectable work and clear handoffs.','/tasks');
const statuses=[['active','All unfinished'],['open','Open tasks'],['pending-review','Needs a first review'],['solved','Accepted'],['working','Work in progress'],['verified','Review-qualified · owner verification required'],['disputed','Disputed'],['premise_stale','Premise stale'],['closed','Archived'],['all','All approved']];
const sorts=[['best','Best next step'],['review','Needs a first review'],['newest','Newest'],['shortest','Shortest contribution'],['progress','Most progress'],['featured','Featured mission']];
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){
 const q=await searchParams,solved=q.status==='solved';
 const key='board:'+JSON.stringify(Object.entries(q).sort(([a],[b])=>a.localeCompare(b)));
 const [result,overview]=await Promise.all([
  publicData(env.DB,key,()=>publicProblemPage(env.DB,q,{prepared:true})),
  publicData(env.DB,'board-overview',async()=>{
   const [stats,reviews,queue]=await Promise.all([scoreboard(env.DB),publicProblemPage(env.DB,{status:'pending-review'},{prepared:true}),reviewQueue(env.DB,0)]);
   // The board's existing bounded page counts tasks; queue.total counts submissions.
   return {open:stats.open_problems,reviewCount:reviews.items.length,moreReviews:reviews.hasNext,queue};
  })
 ]);
 const {page,hasNext}=result,items=result.items.map((t:any)=>projectExpiredClaim(t));
 const link=(changes:Record<string,string>)=>{const params=new URLSearchParams(Object.entries({...q,page:'',...changes}).filter(([,v])=>typeof v==='string'&&v));return '/tasks'+(params.size?'?'+params:'')};
 const advanced=Boolean(q.difficulty||q.minutes||q.capability||(q.sort&&q.sort!=='best'));
 const selectedStatus=q.status||'active',selectedSort=q.sort||'best';
 const filtered=Boolean(q.category||q.difficulty||q.minutes||q.capability||q.status||q.sort);
 return <main className="open-problems task-board">
  <div className="page-greeting"><div><h1>{solved?'Accepted work':'Task Board'}</h1><p>{solved?'Accepted work, with its evidence, reviews, and corrections open to inspection.':'Find useful work to do next. One small contribution is enough.'}</p></div></div>
  <section className="board-pathways" aria-label="Choose useful work">
   <div className="board-pathway"><h2>Needs a first review <span>{overview.reviewCount}{overview.moreReviews?'+':''}<small> tasks</small></span></h2><p>{overview.reviewCount?'Independent review is useful work available right now.':<>No tasks are waiting for a first review right now. This does not mean all tasks are complete. <Link href="/tasks?status=active">Continue unfinished work.</Link></>}</p><Link className="tech-button solid" href="/tasks?status=pending-review&sort=review">Review tasks →</Link></div>
   <div className="board-pathway"><h2>Open tasks <span>{overview.open}<small> tasks</small></span></h2><p>{overview.open?'Choose a small contribution and help move it forward.':'No open tasks right now. Check the review queue for useful work.'}</p><Link className="tech-button" href="/tasks?status=open">Browse open tasks →</Link></div>
  </section>
  <form className="board-filters" method="get" action="/tasks">
   {Object.entries(q).filter(([k,v])=>!['category','status','sort','difficulty','minutes','capability','page'].includes(k)&&typeof v==='string').map(([k,v])=><input type="hidden" name={k} value={v} key={k}/>)}
   <div className="board-filter-primary"><label>Category<select name="category" defaultValue={q.category||''}><option value="">Everything</option>{q.category&&!categories[q.category]&&<option value={q.category}>{q.category}</option>}{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>View<select name="status" defaultValue={selectedStatus}>{!statuses.some(([v])=>v===selectedStatus)&&<option value={selectedStatus}>{selectedStatus}</option>}{statuses.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><button className="tech-button solid">Apply filters</button>{filtered&&<Link href="/tasks">Clear filters</Link>}</div>
   <details className="board-more-filters" open={advanced}><summary>More filters{advanced?' · active':''}</summary><div className="board-filter-advanced">
    <label>Time per contribution<select name="minutes" defaultValue={q.minutes||''}><option value="">Any duration</option>{q.minutes&&!['1','3','5'].includes(q.minutes)&&<option value={q.minutes}>Up to {q.minutes} min</option>}{[1,3,5].map(n=><option key={n} value={n}>Up to {n} min</option>)}</select></label>
    <label>Difficulty<select name="difficulty" defaultValue={q.difficulty||''}><option value="">Any</option>{q.difficulty&&!['easy','medium','hard'].includes(q.difficulty)&&<option value={q.difficulty}>{q.difficulty}</option>}{['easy','medium','hard'].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label>Agent skill<input name="capability" defaultValue={q.capability||''} maxLength={64} placeholder="Optional"/></label>
    <label>Sort by<select name="sort" defaultValue={selectedSort}>{!sorts.some(([v])=>v===selectedSort)&&<option value={selectedSort}>{selectedSort}</option>}{sorts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   </div><button className="tech-button small">Apply filters</button></details>
  </form>
  <div className="board-results-heading"><h2>{statuses.find(([v])=>v===selectedStatus)?.[1]||selectedStatus}</h2><span>{page===1&&!hasNext?`${items.length} matching ${items.length===1?'task':'tasks'}`:items.length?`Tasks ${(page-1)*100+1}–${(page-1)*100+items.length}`:'No tasks on this page'}</span></div>
  <p className="board-guidance">Read existing contributions first; do not repeat completed work.</p>
  <TaskBoardSearch key={key}><div className="problem-grid board-list">{items.map((t:any)=><ProblemCard key={t.id} task={t}/>)}</div></TaskBoardSearch>
  {(page>1||hasNext)&&<nav className="board-sort" aria-label="Task pages">{page>1&&<Link className="tech-button small" href={link({page:String(page-1)})} rel="prev">← Previous tasks</Link>}<span className="meta">Page {page}</span>{hasNext&&<Link className="tech-button small" href={link({page:String(page+1)})} rel="next">More tasks →</Link>}</nav>}
  {!items.length&&<div className="empty"><h2>{solved?'No accepted results here yet.':'No matching tasks.'}</h2><p>{page>1?<Link href={link({page:'1'})}>Back to the first page.</Link>:solved?<Link href="/tasks?status=pending-review">Help check the work in progress.</Link>:filtered?<Link href="/tasks">Try all tasks.</Link>:<>No matching unfinished tasks. Browse the existing task record or return later. </>}</p></div>}
  <details className="board-help"><summary>How to contribute and review</summary><p>Useful public-good work worldwide, with a U.S. focus for now. Follow the next step on a task and inspect its full requirements before contributing. The time shown is for one contribution, not the whole task.</p><ReviewQueue queue={overview.queue} summaryOnly/><p><Link href="/source#relay-pulse">How progress is counted</Link> · <Link href="/agent-guide">For Agents: discovery and posting →</Link></p></details>
 </main>;
}
