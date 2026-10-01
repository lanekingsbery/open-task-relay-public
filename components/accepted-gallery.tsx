'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {AcceptedCard} from '@/lib/accepted-gallery';
import {activityDate} from '@/lib/activity-copy';

const positionKey='otr-accepted-gallery';
export default function AcceptedGallery({items}:{items:AcceptedCard[]|null}){
 const [index,setIndex]=useState(0),[focused,setFocused]=useState(false),[touching,setTouching]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[hovered,setHovered]=useState(false),[pageVisible,setPageVisible]=useState(true);
 const panel=useRef<HTMLElement>(null),start=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const count=items?.length||0,ids=items?.map(item=>item.id).join(',')||'';
 useEffect(()=>{
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(motion.matches);
  update();motion.addEventListener('change',update);
  const visibility=()=>setPageVisible(!document.hidden);visibility();document.addEventListener('visibilitychange',visibility);
  const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting||false),{threshold:.3});
  if(panel.current)observer.observe(panel.current);
  return()=>{motion.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);observer.disconnect()};
 },[]);
 // A finger can leave the card before it is released. Always end the pause,
 // including when the page loses focus before it receives pointerup.
 useEffect(()=>{
  if(!touching)return;
  const release=()=>{start.current=null;setTouching(false)};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release)};
 },[touching]);
 useEffect(()=>{
  if(count<2){setIndex(0);if(count===1)try{sessionStorage.setItem(positionKey,items![0].id)}catch{}return}
  let previous=-1;try{previous=items!.findIndex(item=>item.id===sessionStorage.getItem(positionKey))}catch{}
  const next=previous>=0?(previous+1)%count:Math.floor(Math.random()*count);
  setIndex(next);try{sessionStorage.setItem(positionKey,items![next].id)}catch{}
 },[ids]); // The ordered public snapshot is the dependency, not a new array identity.
 const move=(step:number)=>setIndex(current=>{
  const next=(current+step+count)%count;try{sessionStorage.setItem(positionKey,items![next].id)}catch{}return next;
 });
 const rotating=!focused&&!touching&&!reduced&&visible&&!hovered&&pageVisible&&count>1;
 useEffect(()=>{if(!rotating)return;const timer=setTimeout(()=>move(1),15000);return()=>clearTimeout(timer)},[rotating,ids,index]);
 const manual=(step:number)=>move(step);
 return <section ref={panel} className="home-work-example accepted-gallery" aria-labelledby="home-work-title" aria-roledescription="carousel"
  onPointerEnter={event=>{if(event.pointerType!=='touch')setHovered(true)}} onPointerLeave={()=>setHovered(false)}
  onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocused(false)}}>
  <div className="home-work-heading"><h2 id="home-work-title" className="eyebrow">Accepted work</h2>
   {count>1&&<div className="gallery-controls"><button type="button" aria-label="Previous accepted result" onClick={()=>manual(-1)}>←</button><span aria-live={rotating?'off':'polite'} aria-atomic="true">{index+1} / {count}</span><button type="button" aria-label="Next accepted result" onClick={()=>manual(1)}>→</button></div>}
  </div>
  {items===null?<p>Accepted work is temporarily unavailable. <Link href="/tasks?status=solved">Read accepted work</Link>.</p>:count===0?<p>Accepted results will appear here as work is completed.</p>:<div className="gallery-body"
   onPointerDown={event=>{if(event.pointerType==='touch'){start.current={x:event.clientX,y:event.clientY};swiped.current=false;setTouching(true)}}}
   onPointerCancel={()=>{start.current=null;setTouching(false)}}
   onPointerUp={event=>{setTouching(false);if(!start.current)return;const dx=event.clientX-start.current.x,dy=event.clientY-start.current.y;start.current=null;if(count>1&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){swiped.current=true;manual(dx<0?1:-1)}}}
   onClickCapture={event=>{if(swiped.current){event.preventDefault();swiped.current=false}}}>
   {items.map((item,i)=><article key={item.id} hidden={i!==index} aria-roledescription="slide" aria-label={`${i+1} of ${count}`}>
    <div className="home-work-body"><div><p className="home-work-place">Accepted {item.acceptedAt&&<time dateTime={item.acceptedAt}>{activityDate(item.acceptedAt)}</time>} · {item.author}</p><h3><Link href={'/trophy-case/'+item.id}>{item.title}</Link></h3><p>{item.excerpt}</p></div><Link className="home-result-link" href={'/trophy-case/'+item.id}>Read the result <span aria-hidden="true">→</span></Link></div>
   </article>)}
  </div>}
  {count>1&&<noscript><Link href="/tasks?status=solved">Read all accepted work</Link></noscript>}
 </section>;
}
