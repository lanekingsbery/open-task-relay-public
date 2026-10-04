import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {JsxEmit,ModuleKind,transpileModule} from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {CANONICAL_ORIGIN,transportOrigin} from '../lib/origin.ts';
import {makePrompt} from '../lib/prompt.ts';

const require=createRequire(import.meta.url);
const sameDependencies=(before,after)=>before&&after&&before.length===after.length&&before.every((value,index)=>Object.is(value,after[index]));

// Evaluate the real components with controlled hook lifecycles. These tests
// inspect event handlers, visible JSX and effect cleanup without a built Worker
// or a browser dependency; they never make an external request.
function componentHarness(file,{exportName='default',imports={},globals={}}={}){
 const hooks=[],effects=new Map();let cursor=0,dirty=false,component,props,tree;
 const react={
  useState(initial){
   const index=cursor++;
   if(!hooks[index]){
    const slot={value:typeof initial==='function'?initial():initial};
    slot.set=value=>{const next=typeof value==='function'?value(slot.value):value;if(!Object.is(next,slot.value)){slot.value=next;dirty=true}};
    hooks[index]=slot;
   }
   return [hooks[index].value,hooks[index].set];
  },
  useRef(initial){const index=cursor++;if(!hooks[index])hooks[index]={current:initial};return hooks[index]},
  useMemo(create,dependencies){const index=cursor++;if(!hooks[index]||!sameDependencies(hooks[index].dependencies,dependencies))hooks[index]={value:create(),dependencies};return hooks[index].value},
  useCallback(callback,dependencies){return react.useMemo(()=>callback,dependencies)},
  useEffect(create,dependencies){const index=cursor++;const old=hooks[index];if(!sameDependencies(old?.dependencies,dependencies))effects.set(index,{create,dependencies});else effects.delete(index)},
  useSyncExternalStore(subscribe,snapshot){
   const value=snapshot();
   react.useEffect(()=>{const cleanup=subscribe(()=>{dirty=true});if(!Object.is(value,snapshot()))dirty=true;return cleanup},[subscribe,snapshot]);
   return value;
  },
 };
 const output=transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;
 const exports={};
 runInNewContext(output,{exports,URL,AbortController,Error,TypeError,SyntaxError,console,...globals,require:name=>name==='react'?react:Object.hasOwn(imports,name)?imports[name]:require(name)});
 component=exports[exportName];assert.equal(typeof component,'function');
 const render=(nextProps=props)=>{
  props=nextProps;
  for(let attempts=0;attempts<20;attempts++){
   dirty=false;cursor=0;tree=component(props);
   if(!dirty)return tree;
  }
  throw new Error('Component did not settle its render-time state');
 };
 const flush=()=>{
  for(let attempts=0;attempts<20;attempts++){
   for(const [index,effect] of [...effects]){
    effects.delete(index);hooks[index]?.cleanup?.();
    hooks[index]={dependencies:effect.dependencies,create:effect.create,cleanup:effect.create()};
   }
   if(!dirty&&!effects.size)return tree;
   render();
  }
  throw new Error('Component effects did not settle');
 };
 return {render,flush,get tree(){return tree},replayEffects(){for(const hook of hooks)if(hook?.create){hook.cleanup?.();hook.cleanup=hook.create()}if(dirty)render();return flush()},unmount(){for(const hook of hooks)hook?.cleanup?.();effects.clear()}};
}

function descendants(tree){
 if(Array.isArray(tree))return tree.flatMap(descendants);
 if(!tree||typeof tree!=='object')return [];
 return [tree,...descendants(tree.props?.children)];
}
const find=(tree,predicate)=>{const element=descendants(tree).find(predicate);assert.ok(element,'Expected element was rendered');return element};
const text=tree=>Array.isArray(tree)?tree.map(text).join(''):tree==null||typeof tree==='boolean'?'':typeof tree==='object'?text(tree.props?.children):String(tree);
const button=(tree,label)=>find(tree,node=>typeof node.props?.onClick==='function'&&text(node)===label);

function eventTarget(){
 const listeners=new Map();
 return {
  addEventListener(name,listener){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(listener)},
  removeEventListener(name,listener){listeners.get(name)?.delete(listener)},
  emit(name,event={}){for(const listener of [...(listeners.get(name)||[])])listener(event)},
  count(name){return listeners.get(name)?.size||0},
 };
}

test('prompt copying uses the current approved origin and retains the manual fallback',async()=>{
 const copies=[];let failed=false;
 const harness=componentHarness('components/inline-prompt.tsx',{exportName:'usePromptContents',globals:{window:{location:{href:'https://www.opentaskrelay.org/tasks'}}},imports:{
  'next/link':()=>null,'lucide-react':{Copy:()=>null,Check:()=>null},'@/components/ui/button':{Button:()=>null},'./relay-guide':{Relay:()=>null},
  '@/lib/origin':{CANONICAL_ORIGIN,transportOrigin},'@/lib/prompt':{makePrompt},'@/lib/clipboard':{copyPublicText:async value=>{copies.push(value);if(failed)throw new Error('Clipboard unavailable')}},
 }});
 harness.render({taskId:'synthetic-task'});assert.equal(copies.length,0);
 await button(harness.tree.contents,' Copy prompt').props.onClick();harness.render();
 assert.match(copies[0],/^Open Task Relay: https:\/\/www\.opentaskrelay\.org\/tasks\/synthetic-task/);
 assert.match(text(harness.tree.contents),/Copied/);
 assert.match(text(find(harness.tree.contents,node=>node.type==='pre')),/www\.opentaskrelay\.org/);
 failed=true;await button(harness.tree.contents,' Copied').props.onClick();harness.render();
 assert.match(text(harness.tree.contents),/Select and copy the prompt below/);
 assert.equal(find(harness.tree.contents,node=>node.type==='details').props.open,true);
 harness.unmount();
});

test('navigation closes on pathname changes and preserves Escape focus and outside-click cleanup',()=>{
 const document=eventTarget();let pathname='/tasks',focused=0;
 const trigger={focus(){focused++}},inside={};
 const harness=componentHarness('components/site-brand.tsx',{exportName:'SiteHeader',globals:{document},imports:{
  'next/link':()=>null,'next/image':()=>null,'next/navigation':{usePathname:()=>pathname},'lucide-react':{ChevronDown:()=>null,Menu:()=>null,X:()=>null},
  './theme-provider':{ThemeToggle:()=>null},'@/lib/brand':{SITE_VERSION:'test'},'@/lib/external-links':{externalLinkProps:()=>({})},
 }});
 harness.render();harness.tree.props.ref.current={contains:target=>target===inside};harness.flush();
 const open=()=>{button(harness.tree,'More').props.onClick({currentTarget:trigger});harness.render();harness.flush();assert.equal(button(harness.tree,'More').props['aria-expanded'],true)};
 open();harness.render();harness.flush();assert.equal(button(harness.tree,'More').props['aria-expanded'],true);
 document.emit('keydown',{key:'Escape'});harness.render();harness.flush();assert.equal(focused,1);assert.equal(button(harness.tree,'More').props['aria-expanded'],false);assert.equal(document.count('keydown'),0);
 open();document.emit('pointerdown',{target:inside});harness.render();assert.equal(button(harness.tree,'More').props['aria-expanded'],true);
 document.emit('pointerdown',{target:{}});harness.render();harness.flush();assert.equal(button(harness.tree,'More').props['aria-expanded'],false);
 open();pathname='/activity';harness.render();assert.equal(button(harness.tree,'More').props['aria-expanded'],false);harness.flush();assert.equal(document.count('pointerdown'),0);
 harness.unmount();assert.equal(document.count('keydown'),0);
});

function galleryEnvironment(){
 const window=eventTarget(),document={...eventTarget(),hidden:false},motion={...eventTarget(),matches:false},storage=new Map(),timers=new Map(),observers=[];let nextTimer=0;
 class IntersectionObserver{
  constructor(callback){this.callback=callback;this.disconnected=false;observers.push(this)}
  observe(){}
  disconnect(){this.disconnected=true}
 }
 return {window,document,motion,storage,timers,get observer(){return observers.at(-1)},globals:{window,document,IntersectionObserver,matchMedia:()=>motion,
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id},clearTimeout:id=>timers.delete(id),
 },rotate(){const [id,timer]=[...timers][0]||[];assert.ok(timer,'Expected an automatic rotation timer');assert.equal(timer.delay,15000);timers.delete(id);timer.callback()}};
}

test('gallery remembers its next result and pauses rotation for interaction, motion and visibility',()=>{
 const environment=galleryEnvironment();environment.storage.set('otr-accepted-gallery','one');
 const items=['one','two','three'].map(id=>({id,title:id,author:'Synthetic author',excerpt:'Synthetic accepted result',acceptedAt:null}));
 const harness=componentHarness('components/accepted-gallery.tsx',{globals:environment.globals,imports:{'next/link':()=>null,'@/lib/activity-copy':{activityDate:value=>value}}});
 const selected=()=>find(harness.tree,node=>node.type==='article'&&!node.props.hidden).key;
 const settle=()=>{harness.render();harness.flush()};
 harness.render({items});assert.equal(selected(),'one','The initial hydration snapshot must match the first server-rendered card');harness.tree.props.ref.current={};harness.flush();assert.equal(selected(),'two');assert.equal(environment.storage.get('otr-accepted-gallery'),'two');
 harness.replayEffects();assert.equal(selected(),'two','Replaying mount subscriptions must not skip a second accepted result');
 environment.observer.callback([{isIntersecting:true}]);settle();assert.equal(environment.timers.size,1);
 environment.rotate();settle();assert.equal(selected(),'three');assert.equal(environment.storage.get('otr-accepted-gallery'),'three');
 find(harness.tree,node=>node.props?.['aria-label']==='Next accepted result').props.onClick();settle();assert.equal(selected(),'one');
 harness.tree.props.onPointerEnter({pointerType:'mouse'});settle();assert.equal(environment.timers.size,0);
 harness.tree.props.onPointerLeave();settle();assert.equal(environment.timers.size,1);
 harness.tree.props.onFocusCapture();settle();assert.equal(environment.timers.size,0);
 harness.tree.props.onBlurCapture({currentTarget:{contains:()=>false},relatedTarget:null});settle();assert.equal(environment.timers.size,1);
 const body=()=>find(harness.tree,node=>node.props?.className==='gallery-body');
 body().props.onPointerDown({pointerType:'touch',clientX:100,clientY:20});settle();assert.equal(environment.timers.size,0);assert.equal(environment.window.count('pointerup'),1);
 environment.window.emit('pointerup');settle();assert.equal(environment.timers.size,1);assert.equal(environment.window.count('pointerup'),0);
 environment.motion.matches=true;environment.motion.emit('change');settle();assert.equal(environment.timers.size,0);
 environment.motion.matches=false;environment.motion.emit('change');environment.document.hidden=true;environment.document.emit('visibilitychange');settle();assert.equal(environment.timers.size,0);
 environment.document.hidden=false;environment.document.emit('visibilitychange');settle();assert.equal(environment.timers.size,1);
 harness.render({items:items.map(item=>({...item,title:item.title+' refreshed'}))});harness.flush();assert.equal(selected(),'one','A refreshed array with the same ordered IDs must retain the selected result');
 harness.unmount();assert.equal(environment.timers.size,0);assert.equal(environment.motion.count('change'),0);assert.equal(environment.document.count('visibilitychange'),0);assert.equal(environment.observer.disconnected,true);
});

test('gallery snapshot changes preserve interaction pauses and handle single, empty and unavailable results',()=>{
 const environment=galleryEnvironment();environment.storage.set('otr-accepted-gallery','one');
 const card=id=>({id,title:id,author:'Synthetic author',excerpt:'Synthetic accepted result',acceptedAt:null});
 const harness=componentHarness('components/accepted-gallery.tsx',{globals:environment.globals,imports:{'next/link':()=>null,'@/lib/activity-copy':{activityDate:value=>value}}});
 harness.render({items:['one','two','three'].map(card)});harness.tree.props.ref.current={};harness.flush();environment.observer.callback([{isIntersecting:true}]);harness.render();harness.flush();
 harness.tree.props.onFocusCapture();harness.render();harness.flush();
 harness.render({items:['three','two','one'].map(card)});harness.flush();
 assert.equal(environment.timers.size,0,'A new snapshot must preserve the focus pause');
 assert.equal(find(harness.tree,node=>node.type==='article'&&!node.props.hidden).key,'one');
 harness.render({items:[card('only')]});harness.flush();assert.equal(environment.storage.get('otr-accepted-gallery'),'only');assert.equal(descendants(harness.tree).filter(node=>node.type==='article'&&!node.props.hidden).length,1);
 harness.render({items:[]});harness.flush();assert.match(text(harness.tree),/Accepted results will appear here/);assert.equal(environment.storage.get('otr-accepted-gallery'),'only','Empty results must not erase the previous stored result');
 harness.render({items:null});harness.flush();assert.match(text(harness.tree),/Accepted work is temporarily unavailable/);assert.equal(environment.timers.size,0);
 harness.unmount();
});

test('operator ignores stale responses and changed URLs, and aborts reads when unmounted',async()=>{
 const requests=[],location={href:'https://opentaskrelay.org/moderation/relay?offset=50'};
 const window={location,history:{replaceState(state,title,url){location.href=String(url)}}};
 const view=(offset,source)=>({offset,next_offset:offset+50,source_version:source,control:{enabled:0,revision:1},requests:[],followups:[],receipts:[],health:null,limits:{}});
 const harness=componentHarness('components/relay-operator-view.tsx',{globals:{window,fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,signal:options.signal,resolve,reject}))},imports:{
  'next/link':()=>null,'@/lib/external-links':{externalLinkProps:()=>({})},'@/lib/moderation-copy':{auditRuleLabel:value=>value,moderationText:value=>value,receiptPresentation:value=>value},
  '@/lib/owner-decision-client':{OwnerDecisionError:class extends Error {},ownerDecisionAttempt:()=>{throw new Error('No owner decision expected')},sendOwnerDecision:()=>{throw new Error('No owner decision expected')}},
 }});
 const settle=async()=>{await new Promise(resolve=>setImmediate(resolve));harness.render();harness.flush()};
 const resolve=(request,data)=>request.resolve({ok:true,json:async()=>({data})});
 harness.render();harness.flush();assert.equal(requests[0].url,'/api/moderation/relay?offset=50');assert.match(text(harness.tree),/Loading operations/);
 harness.replayEffects();assert.equal(requests[0].signal.aborted,true);assert.equal(requests.length,2);
 resolve(requests[1],view(50,'current-snapshot'));await settle();assert.match(text(harness.tree),/current-snapshot/);assert.equal(button(harness.tree,'Refresh current page').props.disabled,false);
 resolve(requests[0],view(0,'stale-snapshot'));await settle();assert.doesNotMatch(text(harness.tree),/stale-snapshot/);assert.equal(new URL(location.href).searchParams.get('offset'),'50');
 button(harness.tree,'Next proposals').props.onClick();harness.render();harness.flush();assert.equal(requests[2].url,'/api/moderation/relay?offset=100');
 location.href='https://opentaskrelay.org/moderation/relay?offset=150';resolve(requests[2],view(100,'other-location-snapshot'));await settle();assert.doesNotMatch(text(harness.tree),/other-location-snapshot/);assert.equal(new URL(location.href).searchParams.get('offset'),'150');
 button(harness.tree,'Refresh current page').props.onClick();harness.render();harness.flush();assert.equal(requests[3].url,'/api/moderation/relay?offset=150');
 requests[3].reject(new Error('Synthetic read failure'));await settle();assert.match(text(find(harness.tree,node=>node.props?.role==='alert')),/Synthetic read failure/);assert.equal(button(harness.tree,'Refresh current page').props.disabled,false);
 button(harness.tree,'Refresh current page').props.onClick();harness.render();harness.flush();assert.equal(requests[4].signal.aborted,false);harness.unmount();assert.equal(requests[4].signal.aborted,true);
 requests[4].reject(new Error('Aborted synthetic read'));await new Promise(resolve=>setImmediate(resolve));
});

test('operator request cards safely render malformed persisted summaries and retain readable criteria',()=>{
 const harness=componentHarness('components/relay-operator-view.tsx',{exportName:'RequestCard',imports:{
  'next/link':()=>null,'@/lib/external-links':{externalLinkProps:()=>({})},'@/lib/moderation-copy':{auditRuleLabel:value=>value,moderationText:value=>value,receiptPresentation:value=>value},'@/lib/owner-decision-client':{},
 }});
 const row={id:'synthetic-request',status:'PUBLISHED',reason:'Synthetic fixture',draft_json:null,draft_hash:null,revision:1,task_id:null,created_at:0,
  input_json:JSON.stringify({title:{unsafe:'An object is not a title'},acceptance_criteria:[{},12,'Readable criterion'],sources:[{},true,'https://example.org/source']}),assessment_json:JSON.stringify({assessment:[]}),
 };
 const html=renderToStaticMarkup(harness.render({row,busy:false,decide:async()=>{throw new Error('No owner decision expected')}}));
 assert.match(html,/<h3>Untitled proposal<\/h3>/);assert.match(html,/<li>Readable criterion<\/li>/);assert.match(html,/href="https:\/\/example\.org\/source"/);
 for(const raw of [['Synthetic retained audit value',null],null]){
  const tree=harness.render({row:{...row,input_json:JSON.stringify(raw)},busy:false,decide:async()=>{throw new Error('No owner decision expected')}});
  const audit=find(tree,node=>node.type==='details'&&text(node).startsWith('Original proposal and record'));
  assert.equal(text(find(audit,node=>node.type==='pre')),JSON.stringify(raw,null,2));assert.doesNotThrow(()=>renderToStaticMarkup(tree));
 }
 harness.unmount();
});
