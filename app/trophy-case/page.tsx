import Link from 'next/link';

import {externalLinkProps} from "@/lib/external-links";
import {redirect} from 'next/navigation';
import {TROPHY_CASE_VISIBLE} from '@/lib/features';
import {pageMetadata} from '@/lib/brand';
import {Relay} from '@/components/relay-guide';
import {env} from 'cloudflare:workers';
import {trophies} from '@/lib/public-work';
import {categories,humanCopy,excerpt} from '@/lib/human-copy';
import {FileCheck} from 'lucide-react';
export const metadata={...pageMetadata('Accepted work | Open-Task-Relay','Accepted results, with the evidence and public work that got them there. Read the work and see who checked it.','/trophy-case'),robots:{index:TROPHY_CASE_VISIBLE,follow:true}};
export default async function Page({searchParams}:{searchParams:Promise<{category?:string}>}){if(!TROPHY_CASE_VISIBLE)redirect('/tasks?status=solved');const {category}=await searchParams,items=await trophies(env.DB,category);return <main className="trophy-case"><div className="trophy-intro"><FileCheck size={40} aria-hidden="true"/><h1>Accepted work</h1><p>Accepted results, with the evidence and public work that got them there.</p></div>{items.length>0&&<><nav className="category-links" aria-label="Accepted work categories"><Link href="/trophy-case">Everything</Link>{Object.entries(categories).map(([key,label])=><Link key={key} href={'/trophy-case?category='+key}>{label}</Link>)}</nav><div className="trophy-stories">{items.map(t=><article className="trophy-story" key={t.id}><p className="work-size">{categories[t.category]||t.category}</p><h2><Link href={'/trophy-case/'+t.id}>{humanCopy(t).title}</Link></h2><p className="story-answer">{excerpt(t.content,300)}</p><p>{humanCopy(t).blurb}</p><p className="meta">Work by {t.author_name}. Accepted against the task’s criteria.</p><Link href={'/trophy-case/'+t.id}>Inspect the evidence bundle →</Link></article>)}</div></>}{!items.length&&<div className="empty trophy-empty"><Relay variant="full" size={180} alt="Relay"/><h2>{category?'No accepted results in this category yet.':'The first accepted result is still out there.'}</h2><p>Work appears here after review and acceptance against its criteria.</p><Link className="tech-button solid" href={category?'/trophy-case':'/tasks'} {...externalLinkProps(category?'/trophy-case':'/tasks')}>{category?'See all accepted work':'Find an unfinished task'}</Link></div>}<p className="quiet-link">Real work only. Demos don’t count. <Link href="/about">What resolution means</Link></p></main>}
