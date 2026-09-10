import {requestTiming} from '../lib/request-timing.ts';
import {CANONICAL_ORIGIN} from '../lib/origin.ts';
declare const __PUBLIC_BUILD_KEY__:string;
const FRESH=45_000, RETAIN=165_000;
const policy='public, max-age=0, s-maxage=45, stale-while-revalidate=120';
type Context={waitUntil(p:Promise<unknown>):void};
let generation=0;
const refreshing=new Set<string>();
function keyFor(origin:string){return new Request(origin+'/__relay_home/'+__PUBLIC_BUILD_KEY__);}
async function edge(){try{return typeof caches==='undefined'?null:await caches.open('relay-home-'+__PUBLIC_BUILD_KEY__);}catch{return null;}}
export async function invalidateHomepageHTML(origin:string){generation++;const cache=await edge();try{await cache?.delete(keyFor(origin));}catch{/* Short expiry bounds other locations and cache failures. */}}
function eligible(request:Request){const url=new URL(request.url);return url.origin===CANONICAL_ORIGIN&&url.pathname==='/'&&!url.search&&request.method==='GET'&&!['authorization','cookie','range','cf-access-jwt-assertion'].some(h=>request.headers.has(h))&&![...request.headers.keys()].some(k=>k==='rsc'||k.startsWith('next-')||k.startsWith('x-vinext-'));}
export async function homepageEdge(request:Request,render:()=>Promise<Response>,ctx:Context):Promise<Response>{
 if(!eligible(request))return render();
 const start=performance.now(),cache=await edge(),key=keyFor(new URL(request.url).origin);
 const refresh=/(?:no-cache|no-store|max-age=0)/i.test(request.headers.get('cache-control')||'');
 const deliver=(response:Response,state:string,cached=false)=>{const h=new Headers(response.headers);h.set('Cache-Control',policy);h.set('X-Relay-Page-Cache',state);if(cached){h.delete('Server-Timing');h.set('Age',String(Math.max(0,Math.floor((Date.now()-Number(h.get('X-Relay-Rendered-At')))/1000))));}h.append('Server-Timing',`worker;dur=${(performance.now()-start).toFixed(1)}, home_cache;desc="${state}"`);return new Response(response.body,{status:response.status,headers:h});};
 const fill=async()=>{
  const revision=generation;
  const response=await requestTiming.run({d1:0,queries:0,data:0},async()=>{
   const rendered=await render();
   if(rendered.status!==200||rendered.headers.has('set-cookie')||!rendered.headers.get('content-type')?.includes('text/html')||rendered.headers.get('vary')?.includes('*')||/private/i.test(rendered.headers.get('cache-control')||''))return rendered;
   const body=await rendered.arrayBuffer(),h=new Headers(rendered.headers),t=requestTiming.getStore()!;
   h.set('X-Relay-Rendered-At',String(Date.now()));h.set('Cache-Control',policy);
   h.append('Server-Timing',`home_render;dur=${(performance.now()-start).toFixed(1)}, home_data;dur=${t.data.toFixed(1)}, d1;dur=${t.d1.toFixed(1)};desc="${t.queries} queries; summed wall time"`);
   return new Response(body,{status:200,headers:h});
  });
  if(response.headers.has('X-Relay-Rendered-At')&&cache&&revision===generation){const saved=response.clone();saved.headers.set('Cache-Control',`public, max-age=${RETAIN/1000}`);try{await cache.put(key,saved);if(revision!==generation)await cache.delete(key);}catch{/* Serve even if storage fails. */}}
  return response;
 };
 if(cache&&!refresh){try{const hit=await cache.match(key);if(hit){const age=Date.now()-Number(hit.headers.get('X-Relay-Rendered-At'));if(age>=0&&age<RETAIN){if(age>=FRESH&&!refreshing.has(key.url)){refreshing.add(key.url);ctx.waitUntil(fill().then(()=>{},()=>{}).finally(()=>refreshing.delete(key.url)));}return deliver(hit,age<FRESH?'HIT':'STALE',true);}}}catch{/* Render on cache failures. */}}
 const response=await fill();if(!response.headers.has('X-Relay-Rendered-At'))return response;
 return deliver(response,cache?'MISS':'BYPASS');
}
