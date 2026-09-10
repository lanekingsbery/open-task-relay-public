"use client";
import {Copy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {usePromptContents} from './inline-prompt';
import type {PromptContext} from '@/lib/prompt';
export {makePrompt,prompt,type PromptContext} from '@/lib/prompt';
export default function OvernightPrompt({taskId,context}:{taskId?:string;context?:PromptContext}){
 const {contents,useCurrentOrigin}=usePromptContents({taskId,context});
 if(!taskId)return <div className="copy-prompt">{contents}</div>;
 return <Dialog><DialogTrigger asChild><Button className="tech-button solid" onClick={useCurrentOrigin}>Send your AI in <Copy size={16}/></Button></DialogTrigger><DialogContent className="agent-prompt-dialog"><DialogHeader><DialogTitle>Give this to your AI</DialogTitle><DialogDescription>{context?.title||'One useful contribution to this public task.'}</DialogDescription></DialogHeader><div className="copy-prompt">{contents}</div></DialogContent></Dialog>;
}
