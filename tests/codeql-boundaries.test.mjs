import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {createPreviewServer} from './preview-http.mjs';
import {readPublicSource} from '../lib/relay-request-assessment.ts';

test('loopback preview errors expose neither exception markup nor stack details',async t=>{
 const secret='PRIVATE_FIXTURE_STACK';
 const server=createPreviewServer(async()=>{throw new Error(secret+' <img src=x onerror=alert(1)>')});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/malformed');
 assert.equal(response.status,500);
 assert.equal(response.headers.get('content-type'),'text/plain; charset=utf-8');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(await response.text(),'Local preview request failed.');
});

test('loopback preview preserves successful worker responses',async t=>{
 const server=createPreviewServer(async(url,options)=>{
  assert.equal(new URL(url).pathname,'/fixture');assert.equal(options.method,'GET');
  return new Response('Synthetic response',{status:202,headers:{'Content-Type':'text/plain','X-Fixture':'yes'}});
 });
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/fixture');
 assert.equal(response.status,202);assert.equal(response.headers.get('x-fixture'),'yes');
 assert.equal(await response.text(),'Synthetic response');
});

test('owner request JSON and extracted source text remain escaped React data, including link attributes',async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));
 const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,ws:false}});
 try {
  const {RequestCard}=await vite.ssrLoadModule('/components/relay-operator-view.tsx');
  const markup='<img src=x onerror=alert(1)><script>alert(2)</script>';
  // Deliberately malformed closing tags survive the excerpt heuristic. It is
  // text extraction, not an HTML sanitizer; safety comes from the actual sink.
  const source=await readPublicSource('https://www.usgs.gov/fixture',async()=>new Response('Official source text. '.repeat(5)+'<script>alert(3)</script foo>',{headers:{'Content-Type':'text/html'}}));
  assert.ok(source.excerpt.includes('alert(3)'));
  const url='https://example.org/\" onmouseover=\"alert(4)';
  const value={title:markup,objective:source.excerpt,acceptance_criteria:[markup],sources:[url,'javascript:alert(5)','data:text/html,'+markup,'\tjavascript:alert(6)']};
  const row={id:'fixture',status:'HOLD',reason:markup,revision:1,input_json:JSON.stringify(value),draft_json:JSON.stringify(value),assessment_json:JSON.stringify({assessment:value}),draft_hash:null,task_id:null,created_at:0};
  const html=renderToStaticMarkup(React.createElement(RequestCard,{row,busy:false,decide:async()=>{throw Error('No decisions in rendering test')}}));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(2)&lt;/script&gt;'));
  assert.ok(html.includes('href="https://example.org/&quot; onmouseover=&quot;alert(4)"'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('rel="noreferrer noopener"'));
  const {default:ResolutionCard}=await vite.ssrLoadModule('/components/resolution-card.tsx');
  const candidate={id:'fixture',title:markup,result_id:'result',revision:1,assessment_revision:1,assessment_at:0,assessment_status:'complete',error_code:null,
   task:{revision:1},assessment:{outcome:'needs_synthesis',summary:markup,missing:[markup],next_action:source.excerpt,source_reads:[{url,readable:true}]}};
  const resolution=renderToStaticMarkup(React.createElement(ResolutionCard,{candidate,onSaved:async()=>{throw Error('No decisions in rendering test')}}));
  assert.ok(resolution.includes('&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(2)&lt;/script&gt;'));
  assert.ok(!resolution.includes('<img src=x'));
  assert.ok(!resolution.includes('<script>'));
  assert.ok(resolution.includes('alert(3)'));
 } finally {await vite.close()}
});
