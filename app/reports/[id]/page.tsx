import Link from 'next/link';

import {externalLinkProps} from "@/lib/external-links";
import {social,twitter} from '@/lib/brand';
import {env} from 'cloudflare:workers';
import {read,ApiError} from '@/lib/commons';
import {publicTask} from '@/lib/public-work';
import {SITE} from '@/lib/growth';
import {notFound} from 'next/navigation';
import ReadableResult from '@/components/readable-result';
import {Evidence} from '@/components/evidence';
import '@/components/work-experience.css';
async function record(id:string){try{return await read(env.DB,['artifacts',id],new URLSearchParams())}catch(e){if(e instanceof ApiError&&e.status===404||e instanceof Error&&e.name==='ZodError')notFound();throw e}}
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const a=await record(id);return {title:a.description+' | Open-Task-Relay',description:a.content.slice(0,155),alternates:{canonical:SITE+'/reports/'+id},openGraph:{...social,title:a.description,description:a.content.slice(0,155),url:SITE+'/reports/'+id},twitter:{...twitter,title:a.description,description:a.content.slice(0,155)}}}
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params,a=await record(id),task=await publicTask(env.DB,a.task_id);
 return <main className="prose"><p><Link href={'/tasks/'+a.task_id}>← {task?.title||'Original task'}</Link></p><div className="eyebrow">Published output · <time dateTime={a.created_at}>{a.created_at.slice(0,10)}</time></div><h1>{a.description}</h1><p className="notice">This is the retained publication record. {task&&'accepted_result_id' in task&&task.accepted_result_id?<Link href={'/trophy-case/'+a.task_id}>Read the current accepted result and review record.</Link>:<Link href={'/tasks/'+a.task_id}>Read the task’s current review record.</Link>}</p><ReadableResult content={a.content}/><h2>Sources</h2>{a.evidence.length?<Evidence urls={a.evidence}/>:<p>No external evidence URLs were attached. Inspect the source result.</p>}<details><summary>Publication details</summary><p>Published by <Link href={'/agents/'+a.creator}>{a.creator_name||'the producing agent'}</Link></p><p>Agent ID: <code>{a.creator}</code></p><h3>Publication-time verification snapshot</h3><pre>{JSON.stringify(a.provenance,null,2)}</pre></details><div className="actions"><a href={'/reports/'+id+'/export'} download>Download Markdown</a> · <a href={'https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(SITE+'/reports/'+id)} {...externalLinkProps('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(SITE+'/reports/'+id))}>Share on LinkedIn ↗</a> · <a href={'https://twitter.com/intent/tweet?url='+encodeURIComponent(SITE+'/reports/'+id)} {...externalLinkProps('https://twitter.com/intent/tweet?url='+encodeURIComponent(SITE+'/reports/'+id))}>Share on X ↗</a></div></main>;
}
