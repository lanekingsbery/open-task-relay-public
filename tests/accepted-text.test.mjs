import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {acceptedTextBlocks,bareResultLink,safeResultLink} from '../lib/accepted-text.ts';

test('accepted findings retain each authored number, including years and repeated criterion references',()=>{
 const blocks=acceptedTextBlocks('2023. Source first published.\n2025. Source revised.\n2025. Second source checked.');
 assert.equal(blocks.length,1);
 assert.deepEqual(blocks[0],{kind:'list',ordered:true,start:2023,values:[2023,2025,2025],items:['Source first published.','Source revised.','Second source checked.']});
 for(const original of ['01. A padded reference.\n03. Another reference.','12345678901234567890. A literal identifier.'])assert.deepEqual(acceptedTextBlocks(original),[{kind:'paragraph',text:original}]);
});

test('bare source links retain balanced parentheses and detach only surrounding prose punctuation',()=>{
 const url='https://en.wikipedia.org/wiki/Carbon_(fiber)';
 assert.deepEqual(bareResultLink(url),{url,suffix:''});
 assert.deepEqual(bareResultLink(url+').'),{url,suffix:').'});
 const nested='https://example.org/Outer_(inner_(detail))';
 assert.deepEqual(bareResultLink(nested+';'),{url:nested,suffix:';'});
 assert.equal(safeResultLink('javascript:alert(1)'),null);
 assert.equal(safeResultLink('https://user:secret'+'@example.org/'),null);
});

test('rendered accepted findings preserve explicit list values and exact safe source destinations',async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));
 const vite=await createServer({appType:'custom',configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true,ws:false}});
 try{
  const {default:ReadableResult}=await vite.ssrLoadModule('/components/readable-result.tsx');
  const url='https://en.wikipedia.org/wiki/Carbon_(fiber)';
  const html=renderToStaticMarkup(React.createElement(ReadableResult,{content:'2023. Source first published.\n2025. Source revised.\n\nSee '+url+').\n<script>alert(1)</script>'}));
  assert.match(html,/<ol start="2023"><li value="2023">Source first published\.<\/li><li value="2025">Source revised\.<\/li><\/ol>/);
  assert.ok(html.includes('href="'+url+'"'));
  assert.ok(html.includes(url+'</a>).'));
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>/);
  const adjacent=renderToStaticMarkup(React.createElement(ReadableResult,{content:'Compare [1](https://example.org/a)[2](https://example.org/b).'}));
  assert.equal((adjacent.match(/<a /g)||[]).length,2);
  assert.match(adjacent,/href="https:\/\/example.org\/a"[^>]*>1<\/a><a href="https:\/\/example.org\/b"[^>]*>2<\/a>\./);
  const parentheses=renderToStaticMarkup(React.createElement(ReadableResult,{content:'[Source]('+url+')'}));
  assert.ok(parentheses.includes('href="'+url+'"'),'Markdown source destinations retain balanced parentheses');

 }finally{await vite.close();}
});
