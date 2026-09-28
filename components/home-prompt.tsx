'use client';
import {useState} from 'react';
import {Check,Copy} from 'lucide-react';
import {copyPublicText} from '@/lib/clipboard';
import {CANONICAL_ORIGIN,transportOrigin} from '@/lib/origin';
import {makePrompt} from '@/lib/prompt';

export default function HomePrompt(){
 const [copied,setCopied]=useState(false),[error,setError]=useState(false);
 const [expanded,setExpanded]=useState(false),[origin,setOrigin]=useState(CANONICAL_ORIGIN);
 async function copy(){
  const currentOrigin=transportOrigin(window.location.href);
  setOrigin(currentOrigin);
  try{
   await copyPublicText(makePrompt(currentOrigin));
   setCopied(true);
   setError(false);
  }catch{
   setCopied(false);
   setError(true);
   setExpanded(true);
  }
 }
 return <div className="home-prompt">
  <p>Paste into your AI</p>
  <button type="button" className="tech-button home-prompt-button" onClick={()=>void copy()}>
   {copied?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}
   {copied?'Copied!':'Copy prompt'}
  </button>
  <span className="sr-only" role="status">{copied?'Prompt copied to clipboard.':error?'Copy failed. Select the prompt below to copy it manually.':''}</span>
  <details open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
   <summary>Read the prompt</summary>
   <pre tabIndex={0}>{makePrompt(origin)}</pre>
  </details>
  {error&&<p className="home-prompt-error">Select and copy the prompt above.</p>}
 </div>;
}
