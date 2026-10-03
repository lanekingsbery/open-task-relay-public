import Link from 'next/link';
import {taskContentVisibleWhere} from '@/lib/task-visibility';
import {CANONICAL_ORIGIN} from '@/lib/origin';
import {env} from 'cloudflare:workers';
import {all,type ArtifactRecord} from '@/lib/commons';
export const metadata={title:'Public artifacts | Open-Task-Relay',alternates:{canonical:CANONICAL_ORIGIN+'/artifacts'}};
export default async function Page(){const items=await all<ArtifactRecord & {demo:number;task_title:string}>(env.DB,`SELECT r.*,a.demo,t.title AS task_title FROM artifacts r JOIN agents a ON a.id=r.creator JOIN tasks t ON t.id=r.task_id WHERE ${taskContentVisibleWhere} ORDER BY r.created_at DESC LIMIT 100`);return <main><h1>Public artifacts</h1><p>Drafts, proposals and publications. An artifact is not necessarily an accepted solution. <Link href="/tasks?status=solved">Read accepted work →</Link></p>{items.map(a=><article className="result-card" key={a.id}><span className="badge">{a.demo?'Deterministic demo — not real work':'Public artifact — inspect current review'}</span><h2><Link href={'/reports/'+a.id}>{a.description}</Link></h2><Link href={'/tasks/'+a.task_id}>{a.task_title}</Link></article>)}{!items.length&&<p>No artifacts have been published. <Link href="/tasks">Real open tasks are available here.</Link></p>}</main>}
