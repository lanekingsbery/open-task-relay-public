declare const __PUBLIC_BUILD_KEY__:string;
const informational=new Set(['/about','/privacy','/source','/contact','/security','/agent-guide','/connect','/tools']);
const policy='public, max-age=0, s-maxage=3600, must-revalidate';
// The managed runtime conservatively marks even static renders no-store.
// Cache only complete anonymous HTML, never RSC/prefetch/action variants.
export async function publicPage(request:Request,render:()=>Promise<Response>,ctx:{waitUntil(p:Promise<unknown>):void}):Promise<Response>{
 const url=new URL(request.url);
 const candidate=informational.has(url.pathname)&&request.method==='GET'&&!url.search&&!request.headers.has('authorization')&&!request.headers.has('cookie')&&!request.headers.has('cf-access-jwt-assertion')&&!request.headers.has('range')&&![...request.headers.keys()].some(k=>k==='rsc'||k.startsWith('next-')||k.startsWith('x-vinext-'));
 if(!candidate)return render();
 const key=new Request(new URL('/__relay_pages/'+__PUBLIC_BUILD_KEY__+url.pathname,url.origin));
 let cache:Cache|null=null;
 // Dispatch workers forbid the default cache; use a tenant-scoped named cache.
 // Cache availability must never become page availability.
 try{if(typeof caches!=='undefined')cache=await caches.open('relay-public-'+__PUBLIC_BUILD_KEY__);}catch{cache=null;}
 const refresh=/(?:no-cache|no-store|max-age=0)/i.test(request.headers.get('cache-control')||'');
 if(cache&&!refresh){try{const hit=await cache.match(key);if(hit){const headers=new Headers(hit.headers);headers.set('X-Relay-Page-Cache','HIT');headers.set('Cache-Control',policy);return new Response(hit.body,{status:hit.status,headers});}}catch{cache=null;}}
 const response=await render();
 if(response.status!==200||response.headers.has('set-cookie')||!response.headers.get('content-type')?.includes('text/html'))return response;
 // Complete the stream before cache admission; no partial HTML enters the cache.
 const body=await response.arrayBuffer(),headers=new Headers(response.headers);
 headers.set('Cache-Control',policy);headers.set('X-Relay-Page-Cache',cache?'MISS':'BYPASS');
 const complete=new Response(body,{status:200,headers});
 if(cache)ctx.waitUntil(cache.put(key,complete.clone()).catch(()=>{}));
 return complete;
}
