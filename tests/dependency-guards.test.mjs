import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const micromatch=require('micromatch');
const installed=require.resolve('braces',{paths:[dirname(require.resolve('micromatch'))]});
const braces=require(installed);

test('Satori uses patched fflate and rejects malformed ZIP64 input within a bounded time',()=>{
 const fflatePath=require.resolve('fflate',{paths:[dirname(require.resolve('satori'))]});
 const {zipSync,unzipSync,strToU8}=require(fflatePath);
 assert.deepEqual(unzipSync(zipSync({'fixture.txt':strToU8('fixture')}))['fixture.txt'],strToU8('fixture'));
 // One ZIP64 central-directory entry declares a sentinel size but has no
 // required ZIP64 extra field. Unpatched z64e() loops beyond the input forever.
 const zip=new Uint8Array(144),view=new DataView(zip.buffer);
 view.setUint32(0,0x02014b50,true);view.setUint32(20,0xffffffff,true);
 view.setUint32(46,0x06064b50,true);view.setUint32(78,1,true);
 view.setUint32(102,0x07064b50,true);view.setUint32(110,46,true);
 view.setUint32(122,0x06054b50,true);view.setUint16(130,1,true);view.setUint32(138,0xffffffff,true);
 const child=spawnSync(process.execPath,['-e',`const assert=require('node:assert/strict');const {unzipSync}=require(${JSON.stringify(fflatePath)});assert.throws(()=>unzipSync(Uint8Array.from(${JSON.stringify([...zip])})),error=>error.code===13);`],{timeout:4000,encoding:'utf8'});
 assert.equal(child.error,undefined,'ZIP64 parsing must terminate before the deadline');
 assert.equal(child.status,0,child.stderr);
});

test('both installed Miniflare paths retain HTTP 421 with no Location for alias POST',async()=>{
 const entries=new Set([require.resolve('miniflare'),require.resolve('miniflare',{paths:[dirname(require.resolve('wrangler/package.json'))]})]);
 for(const entry of entries){
  const {Miniflare,convertV4MiniflareOptions}=await import(pathToFileURL(entry));
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {async fetch(request){await request.text();return new Response("Misdirected request",{status:421});}}'}));
  try{
   const response=await mf.dispatchFetch('https://alias.test/',{method:'POST',body:'{}',redirect:'manual'});
   assert.equal(response.status,421);assert.equal(response.headers.get('location'),null);
   assert.equal(await response.text(),'Misdirected request');
  }finally{await mf.dispose();}
 }
});

test('sharp binary license decisions stay limited to reviewed package versions and licenses',()=>{
 const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url)));
 const workflow=readFileSync(new URL('../.github/workflows/dependency-review.yml',import.meta.url),'utf8');
 const approved=[...workflow.matchAll(/pkg:npm\/(\S+)@(\S+?)(?:,|\s|$)/g)].map(([,name,version])=>({name,version}));
 assert.equal(approved.length,14);
 assert.equal(new Set(approved.map(({name})=>name)).size,14);
 for(const {name,version} of approved){
  assert.match(name,/^@img\/sharp-(?:libvips-(?:darwin-(?:arm64|x64)|linux-(?:arm|arm64|ppc64|riscv64|s390x|x64)|linuxmusl-(?:arm64|x64))|wasm32|win32-(?:arm64|ia32|x64))$/);
  assert.equal(version,name.includes('libvips-')?'1.3.4':'0.35.5');
  const copies=Object.entries(lock.packages).filter(([path])=>path===`node_modules/${name}`||path.endsWith(`/node_modules/${name}`));
  assert.ok(copies.length>0);
  for(const [,metadata] of copies){
   assert.equal(metadata.version,version);
   assert.equal(metadata.license,name.includes('libvips-')?'LGPL-3.0-or-later':name.endsWith('wasm32')?'Apache-2.0 AND LGPL-3.0-or-later AND MIT':'Apache-2.0 AND LGPL-3.0-or-later');
  }
 }
 assert.match(workflow,/fail-on-severity: high/);
 assert.match(workflow,/fail-on-scopes: runtime, development, unknown/);
 assert.doesNotMatch(workflow,/(?:license-check|vulnerability-check):\s*false|warn-only:\s*true|allow-ghsas:/);
 assert.doesNotMatch(workflow.match(/allow-licenses:([^\n]+)/)[1],/LGPL/);
});

test('installed glob dependency uses the reviewed local fork',()=>{
 const metadata=JSON.parse(readFileSync(new URL('../vendor/braces/package.json',import.meta.url)));
 assert.equal(metadata.name,'@opentaskrelay/braces');
 assert.equal(metadata.version,'3.0.3-otr.1');
 assert.equal(braces,require('../vendor/braces'));
});

test('reported deeply nested patterns fail with bounded syntax errors in every public path',()=>{
 const pattern='{'.repeat(4000)+'a,b'+'}'.repeat(4000);
 assert.ok(pattern.length<10000);
 for(const operation of [braces,braces.parse,braces.compile,braces.expand,braces.stringify]){
  assert.throws(()=>operation(pattern),error=>error instanceof SyntaxError && /nesting depth/.test(error.message));
 }
 assert.throws(()=>braces.parse('('.repeat(4000)+'x'+')'.repeat(4000)),SyntaxError);
 assert.throws(()=>micromatch.braces(pattern),SyntaxError);
 assert.doesNotThrow(()=>micromatch(['a.js'],pattern));
});

test('caller-supplied recursive or deeply nested ASTs cannot bypass the guard',()=>{
 let node={type:'text',value:'x'};
 for(let i=0;i<4000;i++)node={type:'brace',nodes:[node]};
 const cycle={type:'root',nodes:[]};cycle.nodes.push(cycle);
 for(const operation of [braces.compile,braces.expand,braces.stringify]){
  assert.throws(()=>operation(node),SyntaxError);
  assert.throws(()=>operation(cycle),SyntaxError);
 }
});

test('normal glob patterns, ranges, escapes and parsed ASTs retain their results',()=>{
 assert.deepEqual(micromatch(['src/a.ts','src/b.tsx','src/c.js'],'src/*.{ts,tsx}'),['src/a.ts','src/b.tsx']);
 assert.deepEqual(braces.expand('file-{1..3}.{ts,js}'),['file-1.ts','file-1.js','file-2.ts','file-2.js','file-3.ts','file-3.js']);
 assert.equal(braces.compile('a/{b,c}/d'),'a/(b|c)/d');
 const ast=braces.parse('a/{b,c}/d');
 assert.equal(braces.stringify(ast),'a/{b,c}/d');
 assert.deepEqual(braces.expand(ast),['a/b/d','a/c/d']);
 assert.doesNotThrow(()=>braces.compile('{'.repeat(100)+'x'+'}'.repeat(100)));
 assert.doesNotThrow(()=>braces.compile('"'+ '{'.repeat(4000)+'"'));
});
