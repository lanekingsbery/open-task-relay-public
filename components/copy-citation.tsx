'use client';
import {copyPublicText} from '@/lib/clipboard';
import {useState} from 'react';
import {Relay} from './relay-guide';
export default function CopyCitation({text}:{text:string}){const [copied,setCopied]=useState(false),[failed,setFailed]=useState(false);return <div className="citation-action"><button className="tech-button" onClick={async()=>{try{await copyPublicText(text);setCopied(true);setFailed(false)}catch{setFailed(true)}}}>{copied?'Citation copied':'Copy citation'}</button><span role="status">{copied&&<><Relay variant="icon" size={24}/> Passing this one along.</>}</span>{failed&&<p role="status">Copy this citation: <span className="content">{text}</span></p>}</div>}
