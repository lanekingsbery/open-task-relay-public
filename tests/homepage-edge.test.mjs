import test from 'node:test';
import assert from 'node:assert/strict';
import {homepageEdge,invalidateHomepageHTML} from '../worker/homepage-edge.ts';
test('homepage edge cache: fresh, stale background refresh, invalidation, variants and failures',async()=>{
 globalThis.__PUBLIC_BUILD_KEY__='edge-test';const original=globalThis.caches,realNow=Date.now;
 let now=realNow(),stored=null,renders=0,release;Date.now=()=>now;
 globalThis.caches={open:async()=>({match:async()=>stored?.clone(),put:async(k,r)=>{stored=r},delete:async()=>{stored=null;return true}})};
 const pending=[],ctx={waitUntil:p=>pending.push(p)},request=(headers={},path='/')=>new Request('https://opentaskrelay.org'+path,{headers});
 const render=async()=>{renders++;if(release)await new Promise(r=>release=r);return new Response('<html>'+renders+'</html>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store'}})};
 try{
  const miss=await homepageEdge(request(),render,ctx);assert.equal(miss.headers.get('X-Relay-Page-Cache'),'MISS');assert.match(miss.headers.get('Server-Timing'),/d1;dur=0.0/);
  assert.equal((await homepageEdge(request(),render,ctx)).headers.get('X-Relay-Page-Cache'),'HIT');assert.equal(renders,1);
  now+=46_000;release=true;const stale=await homepageEdge(request(),render,ctx);assert.equal(stale.headers.get('X-Relay-Page-Cache'),'STALE');assert.equal(await stale.text(),'<html>1</html>');assert.doesNotMatch(stale.headers.get('Server-Timing'),/d1;/);assert.equal(renders,2);
  await homepageEdge(request(),render,ctx);assert.equal(renders,2,'Only one background refresh per isolate');
  release();release=null;await Promise.all(pending);assert.equal((await homepageEdge(request(),render,ctx)).headers.get('X-Relay-Page-Cache'),'HIT');
  await invalidateHomepageHTML('https://opentaskrelay.org');assert.equal((await homepageEdge(request(),render,ctx)).headers.get('X-Relay-Page-Cache'),'MISS');
  for(const headers of [{'CF-Access-Jwt-Assertion':'private-owner-token'},{Authorization:'Bearer secret'},{Cookie:'session=secret'},{RSC:'1'},{'Next-Router-Prefetch':'1'},{Range:'bytes=0-9'}])assert.equal((await homepageEdge(request(headers),render,ctx)).headers.get('X-Relay-Page-Cache'),null);
  for(const path of ['/?x=1','/moderation','/api/tasks','/index.rsc'])assert.equal((await homepageEdge(request({},path),render,ctx)).headers.get('X-Relay-Page-Cache'),null);
  const before=renders;await homepageEdge(request({'Cache-Control':'no-cache'}),render,ctx);assert.equal(renders,before+1);
  for(const extra of [{'Set-Cookie':'session=x'},{'Cache-Control':'private, no-store'},{Vary:'*'}]){await invalidateHomepageHTML('https://opentaskrelay.org');await homepageEdge(request(),async()=>new Response('private',{headers:{'Content-Type':'text/html',...extra}}),ctx);assert.equal(stored,null);}
  globalThis.caches={open:async()=>{throw Error('offline')}};assert.equal((await homepageEdge(request(),render,ctx)).headers.get('X-Relay-Page-Cache'),'BYPASS');
 }finally{globalThis.caches=original;Date.now=realNow;delete globalThis.__PUBLIC_BUILD_KEY__;}
});
