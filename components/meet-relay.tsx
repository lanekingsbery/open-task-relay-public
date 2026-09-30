'use client';
import {externalLinkProps} from "@/lib/external-links";

import {useEffect,useRef,useState} from 'react';
import {ArrowUp} from 'lucide-react';
import Link from 'next/link';
import type {IntakePreview} from '@/lib/relay-intake-proposal';
import type {ChatCard} from '@/lib/relay-chat-policy';
import {CHAT_FALLBACK,CHAT_LIMITS,chatRequest} from '@/lib/relay-chat-policy';
import {privateFailure,privateReceipt,startBoundedRequest,type BoundedRequest} from '@/lib/private-request-client';

type Submission={readonly body:string;readonly key:string;confirmed:boolean};
type Turn={id:number;question:string;text:string;cards:ChatCard[];generated?:boolean;pending?:boolean;preview?:IntakePreview;receipt?:string;submission?:Submission;submissionError?:string;statusError?:string};
const VISIBLE_TURNS=12;

export default function MeetRelay(){
 const [message,setMessage]=useState(''),[turns,setTurns]=useState<Turn[]>([]),[phase,setPhase]=useState('');
 const busy=Boolean(phase);
 const input=useRef<HTMLTextAreaElement>(null),log=useRef<HTMLDivElement>(null);
 const controller=useRef<BoundedRequest|null>(null),nextId=useRef(0),followLatest=useRef(true),mounted=useRef(true);
 const tooLong=new TextEncoder().encode(message.trim()).byteLength>CHAT_LIMITS.messageBytes;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();controller.current=null}},[]);
 useEffect(()=>{if(followLatest.current&&log.current)log.current.scrollTop=log.current.scrollHeight},[turns]);

 async function send(event:React.FormEvent){
  event.preventDefault();const question=message.trim();if(!question||controller.current||tooLong)return;
  const id=nextId.current++,body=chatRequest(question,turns);
  const request=startBoundedRequest('/api/relay/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body},126_000);
  controller.current=request;followLatest.current=true;
  setPhase('Relay is preparing a reply…');setMessage('');
  setTurns(previous=>[...previous.filter((turn,index)=>turn.submission||index>=previous.length-(VISIBLE_TURNS-1)),{id,question,text:'',cards:[],pending:true}]);
  input.current?.focus({preventScroll:true});
  let text=CHAT_FALLBACK,cards:ChatCard[]=[],generated=false,preview:IntakePreview|undefined;
  try{
   const {data}=await request.result;
   if(data&&typeof data==='object'){
    const answer=data as {text?:unknown;cards?:unknown;generated?:unknown;preview?:IntakePreview};
    if(typeof answer.text==='string'&&Array.isArray(answer.cards)){text=answer.text;cards=answer.cards;generated=answer.generated===true;preview=answer.preview}
   }
  }catch{/* Friendly fallback; never persist or log messages. */}
  finally{
   if(mounted.current&&controller.current===request){
    controller.current=null;
    setTurns(previous=>previous.map(turn=>turn.id===id?{id,question,text,cards,generated,preview}:turn));
    setPhase('');
   }
  }
 }

 async function confirm(turn:Turn){
  if(controller.current||(!turn.preview&&!turn.submission)||turn.submission?.confirmed)return;
  const submission=turn.submission||{body:JSON.stringify({...turn.preview,confirm:true}),key:turn.preview!.request_key,confirmed:false};
  const request=startBoundedRequest('/api/relay/chat/intake',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:submission.body});
  controller.current=request;setPhase(turn.submission?'Retrying original private proposal…':'Submitting confirmed private proposal…');
  setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,submission,submissionError:undefined,statusError:undefined}:t));
  try{
   const {response,data}=await request.result,receipt=privateReceipt(response,data);
   if(mounted.current&&controller.current===request)setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,receipt:`${receipt.status}: ${receipt.reason}`,submission:{...submission,confirmed:true},preview:undefined,submissionError:undefined}:t));
  }catch(error){if(mounted.current&&controller.current===request)setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,submission,submissionError:'Submission not confirmed. '+privateFailure(error)+' Its outcome is unknown; check status or retry the exact saved submission.'}:t))}
  finally{if(mounted.current&&controller.current===request){controller.current=null;setPhase('')}}
 }

 async function checkStatus(turn:Turn){
  if(controller.current||!turn.submission)return;
  const request=startBoundedRequest('/api/task-requests',{headers:{'X-Request-Key':turn.submission.key},credentials:'omit',cache:'no-store'});
  controller.current=request;setPhase('Checking private request status…');
  setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,statusError:undefined}:t));
  try{
   const {response,data}=await request.result,receipt=privateReceipt(response,data);
   if(mounted.current&&controller.current===request)setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,receipt:`${receipt.status}: ${receipt.reason}`,submission:{...turn.submission!,confirmed:true},preview:undefined,submissionError:undefined,statusError:undefined}:t));
  }catch(error){if(mounted.current&&controller.current===request)setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,statusError:'Status unavailable. '+privateFailure(error)+' Keep the key and try again.'}:t))}
  finally{if(mounted.current&&controller.current===request){controller.current=null;setPhase('')}}
 }

 return <section id="meet-relay" className="meet-relay" aria-labelledby="meet-relay-title">
  <div className="relay-chat-heading"><img src="/brand/relay-icon-96.94e637828dd6.png" width="36" height="36" alt=""/><div><h2 id="meet-relay-title">Chat with Relay</h2><p>Your guide to the tasks and work here.</p></div></div>
  {turns.length===0&&<div className="relay-starters" aria-label="Conversation starters"><button type="button" onClick={()=>{setMessage('Help me find a useful task.');input.current?.focus()}}>Find a task</button><button type="button" onClick={()=>{setMessage('How does Open Task Relay work?');input.current?.focus()}}>How does this work?</button></div>}
  <div id="relay-chat" className="relay-chat">
   <div ref={log} role="log" aria-label="Conversation with Relay" aria-live="polite" aria-relevant="additions text" tabIndex={turns.length?0:-1} className={'relay-chat-log'+(turns.length?'':' relay-chat-empty')} onScroll={()=>{const el=log.current;if(el)followLatest.current=el.scrollHeight-el.scrollTop-el.clientHeight<48}}>
    {turns.map(turn=><div className="relay-chat-turn" key={turn.id}>
     <div className="relay-message relay-question"><span className="sr-only">You: </span><p>{turn.question}</p></div>
     {!turn.pending&&<div className="relay-message relay-answer"><span className="sr-only">Relay: </span>
      {turn.text&&<p>{turn.text}</p>}
      {turn.preview&&<article className="relay-card"><h3>Proposed task: {turn.preview.proposal.title}</h3><dl>
       <dt>Objective</dt><dd>{turn.preview.proposal.objective}</dd><dt>Public beneficiary</dt><dd>{turn.preview.proposal.beneficiary}</dd>
       <dt>Five-minute first step</dt><dd>{turn.preview.proposal.next_action}</dd><dt>Expected output</dt><dd>{turn.preview.proposal.expected_output}</dd>
       <dt>Acceptance criteria</dt><dd><ul>{turn.preview.proposal.acceptance_criteria.map((c,i)=><li key={i}>{c}</li>)}</ul></dd>
       <dt>Public sources (awaiting checks)</dt><dd><ul>{turn.preview.proposal.sources.map(u=><li key={u}>{u}</li>)}</ul></dd><dt>Category</dt><dd>{turn.preview.proposal.category}</dd>
      </dl><p>Submit these details privately for assessment? Your chat transcript is not submitted. Relay may publish one qualified task per UTC day; uncertain proposals need owner review.</p>
      {!turn.submission&&<button type="button" disabled={busy} onClick={()=>void confirm(turn)}>Confirm submission</button>}{' '}
      <button type="button" disabled={busy} onClick={()=>setTurns(previous=>previous.map(t=>t.id===turn.id?{...t,preview:undefined,receipt:turn.submission?'Ask Relay to propose a corrected task. The earlier submission may still exist; retain its key and check status.':'Not submitted. Ask Relay to propose a corrected task.'}:t))}>Cancel / correct</button></article>}
      {turn.receipt&&<p role="status" style={{overflowWrap:'anywhere'}}>{turn.receipt}</p>}
      {turn.submissionError&&<p role="alert">{turn.submissionError}</p>}
      {turn.statusError&&<p role="alert">{turn.statusError}</p>}
      {turn.submission&&<div className="relay-private-recovery"><p style={{overflowWrap:'anywhere'}}>Private request key: <code>{turn.submission.key}</code>. Save it to check the decision at <Link href="/task-requests#request-status">Request status</Link>.</p><div className="actions">{!turn.submission.confirmed&&<button type="button" disabled={busy} onClick={()=>void confirm(turn)}>Retry exact submission</button>}<button type="button" disabled={busy} onClick={()=>void checkStatus(turn)}>Check private request status</button></div></div>}
      {turn.cards.length>0&&<div className="relay-cards"><p className="relay-chat-note">Verified site records</p>{turn.cards.map(card=><article key={card.id} className="relay-card">
       <p className="relay-card-text">{card.text}</p><p className="relay-chat-source"><a href={card.href} {...externalLinkProps(card.href)}>{card.id}</a> · Checked <time dateTime={card.observed_at}>{new Date(card.observed_at).toLocaleString()}</time>{card.updated_at&&<> · Record updated <time dateTime={card.updated_at}>{new Date(card.updated_at).toLocaleString()}</time></>}</p>
      </article>)}</div>}
     </div>}
    </div>)}
   </div>
   <form className="relay-composer" onSubmit={send}>
    <div className="relay-chat-status" role="status">{phase|| (tooLong?'Please shorten your message.':'')}</div>
    <label htmlFor="relay-question" className="sr-only">Message Relay</label>
    <div className="relay-composer-input"><textarea ref={input} id="relay-question" value={message} onChange={e=>setMessage(e.target.value)} maxLength={1200} rows={2} placeholder="Ask about OTR, find a task, or propose a new one" aria-describedby="relay-chat-privacy" onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.keyCode!==229){event.preventDefault();event.currentTarget.form?.requestSubmit()}}}/><button className="tech-button solid" type="submit" disabled={busy||!message.trim()||tooLong} aria-label="Send message"><ArrowUp size={20} aria-hidden="true"/></button></div>
    <p id="relay-chat-privacy" className="relay-chat-note">Keep keys and private information out of chat.</p>
   </form>
  </div>
 </section>;
}
