import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {acceptedTextBlocks,bareResultLink,safeResultLink} from '../lib/accepted-text.ts';

test('standard tables support alignment, borderless syntax, empty cells, escaped pipes and inline code',()=>{
 const blocks=acceptedTextBlocks('Context\nA | B | C\n:--- | :---: | ---:\nleft | **middle** | `a|b`\nnext | | literal\\|pipe\n\nAfter');
 assert.deepEqual(blocks,[{kind:'paragraph',text:'Context'},{kind:'table',headers:['A','B','C'],rows:[['left','**middle**','`a|b`'],['next','','literal\\|pipe']],align:['left','center','right']},{kind:'paragraph',text:'After'}]);
});

test('separatorless historical table shapes render without rewriting their authored content',()=>{
 for(const columns of [2,3]){
  const headers=Array.from({length:columns},(_,i)=>'Field '+i),rows=Array.from({length:3},(_,r)=>headers.map((_,i)=>'Value '+r+':'+i));
  const content=[headers,...rows].map(row=>'| '+row.join(' | ')+' |').join('\r\n');
  assert.deepEqual(acceptedTextBlocks(content),[{kind:'table',headers,rows,align:headers.map(()=>'left')}]);
  assert.equal(content.includes('---'),false);
 }
});

test('ambiguous, ragged and fenced pipe text stays visible as text, with no dropped cells',()=>{
 for(const text of ['a | b','| header | value |\n| one | two |','| a | b |\n| --- | --- |\n| one | two | extra |\n| x | y |\n| z | w |\n| q | r |','a | b\n--- | invalid\none | two'])assert.deepEqual(acceptedTextBlocks(text),[{kind:'paragraph',text}]);
 const text='```markdown\n| a | b |\n| --- | --- |\n| 1 | 2 |\n```';
 assert.deepEqual(acceptedTextBlocks(text),[{kind:'code',text}]);
});

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
  const table=renderToStaticMarkup(React.createElement(ReadableResult,{content:'| Field | Evidence |\n| --- | --- |\n| **Date** | [Source](https://example.org/source) |\n| <img src=x onerror=alert(1)> | <script>alert(1)</script> [bad](javascript:alert(1)) |'}));
  assert.match(table,/<div class="result-table-scroll" tabindex="0" role="region" aria-label="Result table; scroll horizontally for more columns"><table><thead>/);
  assert.equal((table.match(/scope="col"/g)||[]).length,2);
  assert.equal((table.match(/<td /g)||[]).length,4);
  assert.match(table,/<strong>Date<\/strong>/);assert.match(table,/href="https:\/\/example.org\/source"/);
  assert.match(table,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.match(table,/&lt;script&gt;/);
  assert.doesNotMatch(table,/<script|<img|href="javascript:/);
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
