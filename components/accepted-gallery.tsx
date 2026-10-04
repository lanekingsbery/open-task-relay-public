'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import type {AcceptedCard} from '@/lib/accepted-gallery';
import {activityDate} from '@/lib/activity-copy';

const positionKey='otr-accepted-gallery';
// Session position is browser state. The server snapshot stays at the first
// card; subscribing after hydration selects the next saved card exactly once.
// New object identities with the same ordered IDs keep the current position.
function galleryPosition(snapshot:string){
 const ids:string[]=JSON.parse(snapshot),count=ids.length,listeners=new Set<()=>void>();
 let index=0,initialized=false;
 const save=()=>{if(count)try{sessionStorage.setItem(positionKey,ids[index])}catch{}};
 return {snapshot,getSnapshot:()=>index,getServerSnapshot:()=>0,
  subscribe:(listener:()=>void)=>{
   listeners.add(listener);
   if(!initialized){
    initialized=true;
    let previous=-1;try{previous=ids.indexOf(sessionStorage.getItem(positionKey)||'')}catch{}
    index=count<2?0:previous>=0?(previous+1)%count:Math.floor(Math.random()*count);save();
   }
   return()=>{listeners.delete(listener)};
  },
  move:(step:number)=>{if(count<2)return;index=(index+step+count)%count;save();listeners.forEach(listener=>listener())},
 };
}
export default function AcceptedGallery({items}:{items:AcceptedCard[]|null}){
 const [focused,setFocused]=useState(false),[touching,setTouching]=useState(false),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[hovered,setHovered]=useState(false),[pageVisible,setPageVisible]=useState(true);
 const panel=useRef<HTMLElement>(null),start=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const count=items?.length||0,ids=JSON.stringify(items?.map(item=>item.id)||[]);
 const [position,setPosition]=useState(()=>galleryPosition(ids));
 // Reconcile the ordered snapshot without resetting focus or pointer pauses.
 if(position.snapshot!==ids)setPosition(galleryPosition(ids));
 const index=useSyncExternalStore(position.subscribe,position.getSnapshot,position.getServerSnapshot);
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
 const rotating=!focused&&!touching&&!reduced&&visible&&!hovered&&pageVisible&&count>1;
 useEffect(()=>{if(!rotating)return;const timer=setTimeout(()=>position.move(1),15000);return()=>clearTimeout(timer)},[rotating,position,index]);
 const manual=(step:number)=>position.move(step);
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
    <div className="home-work-body"><div><p className="home-work-place">Accepted {item.acceptedAt&&<time dateTime={item.acceptedAt}>{activityDate(item.acceptedAt)}</time>}{item.author&&<> · {item.author}</>}</p><h3><Link href={'/trophy-case/'+item.id}>{item.title}</Link></h3><p>{item.excerpt}</p></div><Link className="home-result-link" href={'/trophy-case/'+item.id}>Read the result <span aria-hidden="true">→</span></Link></div>
    {item.conclusion&&<div className="home-work-conclusion"><span className="conclusion-mark" aria-hidden="true">✓</span><div><p className="conclusion-label">What we learned</p><p>{item.conclusion}</p></div></div>}
   </article>)}
  </div>}
  {count>1&&<noscript><Link href="/tasks?status=solved">Read all accepted work</Link></noscript>}
 </section>;
}
