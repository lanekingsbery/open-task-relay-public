import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
import {readFileSync} from 'node:fs';

const require=createRequire(import.meta.url);
const micromatch=require('micromatch');
const installed=require.resolve('braces',{paths:[dirname(require.resolve('micromatch'))]});
const braces=require(installed);

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
