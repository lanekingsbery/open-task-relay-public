'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {AcceptedCard} from '@/lib/accepted-gallery';
import {activityDate} from '@/lib/activity-copy';

const positionKey='otr-accepted-gallery';
export default function AcceptedGallery({items}:{items:AcceptedCard[]|null}){
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(true),[reduced,setReduced]=useState(true),[visible,setVisible]=useState(false),[hovered,setHovered]=useState(false),[pageVisible,setPageVisible]=useState(true);
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
 useEffect(()=>{
  if(count<2){setIndex(0);if(count===1)try{sessionStorage.setItem(positionKey,items![0].id)}catch{}return}
  let previous=-1;try{previous=items!.findIndex(item=>item.id===sessionStorage.getItem(positionKey))}catch{}
  const next=previous>=0?(previous+1)%count:Math.floor(Math.random()*count);
  setIndex(next);try{sessionStorage.setItem(positionKey,items![next].id)}catch{}
 },[ids]); // The ordered public snapshot is the dependency, not a new array identity.
 const move=(step:number)=>setIndex(current=>{
  const next=(current+step+count)%count;try{sessionStorage.setItem(positionKey,items![next].id)}catch{}return next;
 });
 const rotating=playing&&!reduced&&visible&&!hovered&&pageVisible&&count>1;
 useEffect(()=>{if(!rotating)return;const timer=setInterval(()=>move(1),15000);return()=>clearInterval(timer)},[rotating,ids]);
 const manual=(step:number)=>{setPlaying(false);move(step)};
 return <section ref={panel} className="home-work-example accepted-gallery" aria-labelledby="home-work-title" aria-roledescription="carousel"
  onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
  onFocusCapture={event=>{if(!(event.target as HTMLElement).closest('[data-gallery-play]'))setPlaying(false)}}>
  <div className="home-work-heading"><h2 id="home-work-title" className="eyebrow">Accepted work</h2>
   {count>1&&<div className="gallery-controls"><button type="button" aria-label="Previous accepted result" onClick={()=>manual(-1)}>←</button><span aria-live={rotating?'off':'polite'} aria-atomic="true">{index+1} / {count}</span><button type="button" aria-label="Next accepted result" onClick={()=>manual(1)}>→</button>{!reduced&&<button type="button" data-gallery-play aria-label={playing?'Pause automatic rotation':'Resume automatic rotation'} onClick={()=>setPlaying(value=>!value)}>{playing?'Pause':'Play'}</button>}</div>}
  </div>
  {items===null?<p>Accepted work is temporarily unavailable. <Link href="/tasks?status=solved">Read accepted work</Link>.</p>:count===0?<p>Accepted results will appear here as work is completed.</p>:<div className="gallery-body"
   onPointerDown={event=>{if(event.pointerType==='touch'){start.current={x:event.clientX,y:event.clientY};swiped.current=false;setPlaying(false)}}}
   onPointerCancel={()=>{start.current=null}}
   onPointerUp={event=>{if(!start.current)return;const dx=event.clientX-start.current.x,dy=event.clientY-start.current.y;start.current=null;if(count>1&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){swiped.current=true;manual(dx<0?1:-1)}}}
   onClickCapture={event=>{if(swiped.current){event.preventDefault();swiped.current=false}}}>
   {items.map((item,i)=><article key={item.id} hidden={i!==index} aria-roledescription="slide" aria-label={`${i+1} of ${count}`}>
    <div className="home-work-body"><div><p className="home-work-place">Accepted {item.acceptedAt&&<time dateTime={item.acceptedAt}>{activityDate(item.acceptedAt)}</time>} · {item.author}</p><h3><Link href={'/trophy-case/'+item.id}>{item.title}</Link></h3><p>{item.excerpt}</p></div><Link className="home-result-link" href={'/trophy-case/'+item.id}>Read the result <span aria-hidden="true">→</span></Link></div>
   </article>)}
  </div>}
  {count>1&&<noscript><Link href="/tasks?status=solved">Read all accepted work</Link></noscript>}
 </section>;
}
