import {CANONICAL_ORIGIN} from '@/lib/origin';
import {env} from 'cloudflare:workers';
import {rss} from '@/lib/growth';
export async function GET(r:Request){return new Response(await rss(env.DB,CANONICAL_ORIGIN),{headers:{'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public, max-age=300'}})}
