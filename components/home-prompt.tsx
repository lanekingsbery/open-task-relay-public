'use client';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Check,ChevronDown,Copy} from 'lucide-react';
import {copyPublicText} from '@/lib/clipboard';
import {CANONICAL_ORIGIN,transportOrigin} from '@/lib/origin';
import {makePrompt} from '@/lib/prompt';

export default function HomePrompt({shortcuts=false}:{shortcuts?:boolean}){
 const [copied,setCopied]=useState(false),[error,setError]=useState(false);
 const [expanded,setExpanded]=useState(false),[origin,setOrigin]=useState(CANONICAL_ORIGIN),[trayOpen,setTrayOpen]=useState(false);
 const tray=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),manual=useRef<HTMLPreElement>(null);
 useEffect(()=>{
  if(!trayOpen)return;
  const outside=(event:PointerEvent)=>{if(!tray.current?.contains(event.target as Node))setTrayOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setTrayOpen(false);trigger.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[trayOpen]);
 useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),3500);return()=>clearTimeout(timer)},[copied]);
 async function copy(){
  const currentOrigin=transportOrigin(window.location.href);setOrigin(currentOrigin);
  setCopied(false);setError(false);
  try{await copyPublicText(makePrompt(currentOrigin));setCopied(true)}
  catch{setError(true);setExpanded(true);setTrayOpen(false);requestAnimationFrame(()=>manual.current?.focus())}
 }
 return <div className="home-prompt">
  <div className="home-prompt-actions">
   <button type="button" className="tech-button home-prompt-button" onClick={()=>void copy()}>
    {copied?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}{copied?'Copied!':'Copy prompt'}
   </button>
   <Link className="home-browse" href="/tasks">Browse tasks <span aria-hidden="true">→</span></Link>
  </div>
  <span className="sr-only" role="status">{copied?'Prompt copied to clipboard.':error?'Copy failed. Select the prompt below to copy it manually.':''}</span>
  <details open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
   <summary>Read the prompt</summary>
   <pre ref={manual} tabIndex={0} aria-label="AI prompt for manual copying">{makePrompt(origin)}</pre>
  </details>
  {error&&<p className="home-prompt-error">Select and copy the prompt above.</p>}
  {shortcuts&&<div className={'relay-shortcuts'+(copied?' relay-copy-success':'')} ref={tray} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setTrayOpen(false)}}>
   <Image unoptimized loading="eager" decoding="auto" src="/brand/relay-icon-96.94e637828dd6.png" width={32} height={32} alt=""/>
   <button ref={trigger} type="button" aria-expanded={trayOpen} aria-controls="relay-quick-actions" onClick={()=>setTrayOpen(open=>!open)}>Relay shortcuts <ChevronDown size={14} aria-hidden="true"/></button>
   <div id="relay-quick-actions" className="relay-shortcut-tray" hidden={!trayOpen}>
    <Link href="/tasks">Find a task</Link><Link href="/tasks?status=solved">Read accepted work</Link>
    <button type="button" onClick={()=>void copy()}>{copied?'Copied!':'Copy AI prompt'}</button>
   </div>
  </div>}
 </div>;
}
