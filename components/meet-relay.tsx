'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUp} from 'lucide-react';
import type {ChatCard} from '@/lib/relay-chat-policy';
import {CHAT_FALLBACK,CHAT_LIMITS,chatRequest} from '@/lib/relay-chat-policy';

type Turn={id:number;question:string;text:string;cards:ChatCard[];generated?:boolean;pending?:boolean};
const VISIBLE_TURNS=12;

export default function MeetRelay(){
 const [message,setMessage]=useState(''),[turns,setTurns]=useState<Turn[]>([]),[busy,setBusy]=useState(false);
 const input=useRef<HTMLTextAreaElement>(null),log=useRef<HTMLDivElement>(null);
 const controller=useRef<AbortController|null>(null),nextId=useRef(0),followLatest=useRef(true);
 const tooLong=new TextEncoder().encode(message.trim()).byteLength>CHAT_LIMITS.messageBytes;
 useEffect(()=>()=>{controller.current?.abort();controller.current=null},[]);
 useEffect(()=>{if(followLatest.current&&log.current)log.current.scrollTop=log.current.scrollHeight},[turns]);

 async function send(event:React.FormEvent){
  event.preventDefault();const question=message.trim();if(!question||controller.current||tooLong)return;
  const request=new AbortController(),id=nextId.current++;
  controller.current=request;followLatest.current=true;
  const body=chatRequest(question,turns);
  setBusy(true);setMessage('');
  setTurns(previous=>[...previous.slice(-(VISIBLE_TURNS-1)),{id,question,text:'',cards:[],pending:true}]);
  input.current?.focus({preventScroll:true});
  const timeout=setTimeout(()=>request.abort(),26_000);
  let text=CHAT_FALLBACK,cards:ChatCard[]=[],generated=false;
  try{
   const response=await fetch('/api/relay/chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body,signal:request.signal});
   const data=await response.json();
   if(typeof data.text==='string'&&Array.isArray(data.cards)){text=data.text;cards=data.cards;generated=data.generated===true}
  }catch{/* Friendly fallback; never persist or log messages. */}
  finally{
   clearTimeout(timeout);
   if(controller.current===request){
    controller.current=null;
    setTurns(previous=>previous.map(turn=>turn.id===id?{id,question,text,cards,generated}:turn));
    setBusy(false);
   }
  }
 }

 return <section id="meet-relay" className="meet-relay" aria-labelledby="meet-relay-title">
  <div className="relay-chat-heading"><img src="/brand/relay-icon-96.94e637828dd6.png" width="36" height="36" alt=""/><h2 id="meet-relay-title">Chat with Relay.</h2></div>
  <div id="relay-chat" className="relay-chat">
   <div ref={log} role="log" aria-label="Conversation with Relay" aria-live="polite" aria-relevant="additions text" tabIndex={turns.length?0:-1} className={'relay-chat-log'+(turns.length?'':' relay-chat-empty')} onScroll={()=>{const el=log.current;if(el)followLatest.current=el.scrollHeight-el.scrollTop-el.clientHeight<48}}>
    {turns.map(turn=><div className="relay-chat-turn" key={turn.id}>
     <div className="relay-message relay-question"><span className="sr-only">You: </span><p>{turn.question}</p></div>
     {!turn.pending&&<div className="relay-message relay-answer"><span className="sr-only">Relay: </span>
      {turn.text&&<p>{turn.text}</p>}
      {turn.cards.length>0&&<div className="relay-cards"><p className="relay-chat-note">Verified site records</p>{turn.cards.map(card=><article key={card.id} className="relay-card">
       <p className="relay-card-text">{card.text}</p><p className="relay-chat-source"><a href={card.href}>{card.id}</a> · Checked <time dateTime={card.observed_at}>{new Date(card.observed_at).toLocaleString()}</time>{card.updated_at&&<> · Record updated <time dateTime={card.updated_at}>{new Date(card.updated_at).toLocaleString()}</time></>}</p>
      </article>)}</div>}
     </div>}
    </div>)}
   </div>
   <form className="relay-composer" onSubmit={send}>
    <div className="relay-chat-status" role="status">{busy?'Relay is thinking…':tooLong?'Please shorten your message.':''}</div>
    <label htmlFor="relay-question" className="sr-only">Message Relay</label>
    <div className="relay-composer-input"><textarea ref={input} id="relay-question" value={message} onChange={e=>setMessage(e.target.value)} maxLength={1200} rows={2} placeholder="Ask a question, find something useful, submit a task, review some work, run a leg" aria-describedby="relay-chat-privacy" onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.keyCode!==229){event.preventDefault();event.currentTarget.form?.requestSubmit()}}}/><button className="tech-button solid" type="submit" disabled={busy||!message.trim()||tooLong} aria-label="Send message"><ArrowUp size={20} aria-hidden="true"/></button></div>
    <p id="relay-chat-privacy" className="relay-chat-note">Keep keys and private information out of chat.</p>
   </form>
  </div>
 </section>;
}
