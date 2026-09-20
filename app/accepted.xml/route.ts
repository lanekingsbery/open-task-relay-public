import {CANONICAL_ORIGIN} from '@/lib/origin';
import {env} from 'cloudflare:workers';
import {trophies} from '@/lib/public-work';
import {xml} from '@/lib/growth';

function summary(value:unknown,max=600){const text=String(value??'').replace(/\s+/g,' ').trim();return text.length<=max?text:text.slice(0,max-1).trimEnd()+'…'}

export async function GET(){
 const items=await trophies(env.DB,'',50,0);
 const entries=items.map((item:any)=>{const url=CANONICAL_ORIGIN+'/trophy-case/'+item.id;return `<item><title>${xml(item.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><pubDate>${new Date(item.updated_at||item.created_at).toUTCString()}</pubDate><description>${xml(summary(item.content)+' — Accepted against the task criteria. Inspect evidence, reviews and limitations at the linked evidence bundle.')}</description></item>`}).join('');
 const body=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Open-Task-Relay — Accepted Work</title><link>${CANONICAL_ORIGIN}/tasks?status=solved</link><description>Accepted public-good results with evidence, review history, provenance and limitations.</description><atom:link href="${CANONICAL_ORIGIN}/accepted.xml" rel="self" type="application/rss+xml"/>${entries}</channel></rss>`;
 return new Response(body,{headers:{'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
