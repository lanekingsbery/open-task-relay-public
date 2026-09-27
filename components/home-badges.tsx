'use client';
import {useState} from 'react';
import {HOME_BADGES} from '@/lib/project-links';

export default function HomeBadges(){
 const [failed,setFailed]=useState<string[]>([]);
 // An image can fail before hydration attaches onError; also check on mount.
 const markFailed=(name:string)=>setFailed(previous=>previous.includes(name)?previous:[...previous,name]);
 return <ul id="project-records" className="home-badges" aria-label="Project links">
  {HOME_BADGES.map(badge=><li key={badge.name}><a href={badge.href} aria-label={badge.name} rel="noopener noreferrer">
   {failed.includes(badge.name)?<span className="home-badge-fallback">{badge.name}</span>:<img src={badge.src} alt={badge.name} height={20} loading="lazy" decoding="async" referrerPolicy="no-referrer" ref={image=>{if(image?.complete&&image.naturalWidth===0)markFailed(badge.name)}} onError={()=>markFailed(badge.name)}/>}
  </a></li>)}
 </ul>;
}
