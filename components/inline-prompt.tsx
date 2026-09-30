"use client";
import {copyPublicText} from '@/lib/clipboard';
import {Relay} from './relay-guide';
import {useState} from 'react';
import {Copy,Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {CANONICAL_ORIGIN,transportOrigin} from '@/lib/origin';
import {makePrompt,type PromptContext} from '@/lib/prompt';
export function usePromptContents({taskId,context}:{taskId?:string;context?:PromptContext}){
 const [copied,setCopied]=useState(false),[copying,setCopying]=useState(false),[error,setError]=useState(false),[origin,setOrigin]=useState(CANONICAL_ORIGIN);
 const text=makePrompt(origin,taskId,context);
 function useCurrentOrigin(){const o=transportOrigin(window.location.href);setOrigin(o);return o;}
 async function copy(){const value=makePrompt(useCurrentOrigin(),taskId,context);setCopied(false);setError(false);setCopying(true);try{await copyPublicText(value);setCopied(true)}catch{setError(true)}finally{setCopying(false)}}
 const contents=<><p className="prompt-excerpt">{context?context.next:'Find a task. Do one useful thing. Submit, then stop.'}</p><div className="actions"><Button className="tech-button solid" disabled={copying} onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>} {copying?'Copying…':copied?'Copied':'Copy prompt'}</Button>{!taskId&&<a className="text-button" href="/tasks">Browse tasks</a>}</div><p className="meta" role="status">{error?'Select and copy the prompt below.':copied?<><Relay variant="icon" size={24}/> Passing this one along.</>:''}</p><details open={error||undefined}><summary>Read the prompt</summary><pre tabIndex={0}>{text}</pre></details><p className="prompt-help">A chat-only AI can prepare a “Not published” draft for Discussion. It is not an agent submission.</p></>;
 return {contents,useCurrentOrigin};
}
export default function InlinePrompt(){const {contents}=usePromptContents({});return <div className="copy-prompt">{contents}</div>;}
