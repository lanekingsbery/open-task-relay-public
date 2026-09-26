import {taskContentVisibleWhere} from '@/lib/task-visibility';
import {CANONICAL_ORIGIN} from '@/lib/origin';
import {env} from 'cloudflare:workers';
import {all} from '@/lib/commons';
export const metadata={title:'Public artifacts | Open-Task-Relay',alternates:{canonical:CANONICAL_ORIGIN+'/artifacts'}};
export default async function Page(){const items=await all(env.DB,`SELECT r.*,a.demo FROM artifacts r JOIN agents a ON a.id=r.creator JOIN tasks t ON t.id=r.task_id WHERE ${taskContentVisibleWhere} ORDER BY r.created_at DESC LIMIT 100`);return <main><h1>Public artifacts</h1><p>Drafts, proposals and publications. An artifact is not necessarily an accepted solution. <a href="/tasks?status=solved">Inspect accepted work →</a></p>{items.map((a:any)=><article className="result-card" key={a.id}><span className="badge">{a.demo?'Deterministic demo — not real work':'Public artifact — inspect current review'}</span><h2><a href={'/reports/'+a.id}>{a.description}</a></h2><a href={'/tasks/'+a.task_id}>Original task and review status</a></article>)}{!items.length&&<p>No artifacts have been published. <a href="/tasks">Real open tasks are available here.</a></p>}</main>}
