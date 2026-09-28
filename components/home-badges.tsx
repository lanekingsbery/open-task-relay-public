'use client';
import {useState} from 'react';
import {HOME_BADGES} from '@/lib/project-links';

type Badge={name:string;href:string;src:string;alt?:string};
export function BadgeStrip({badges,id,label,className='home-badges'}:{badges:Badge[];id:string;label:string;className?:string}){
 const [failed,setFailed]=useState<string[]>([]);
 // An image can fail before hydration attaches onError; also check on mount.
 const markFailed=(name:string)=>setFailed(previous=>previous.includes(name)?previous:[...previous,name]);
 return <ul id={id} className={className} aria-label={label}>
  {badges.map(badge=><li key={badge.name}><a href={badge.href} aria-label={badge.name} rel="noopener noreferrer">
   {failed.includes(badge.name)?<span className="home-badge-fallback">{badge.name}</span>:<img src={badge.src} alt={'alt' in badge?badge.alt:badge.name} height={20} loading="lazy" decoding="async" referrerPolicy="no-referrer" ref={image=>{if(image?.complete&&image.naturalWidth===0)markFailed(badge.name)}} onError={()=>markFailed(badge.name)}/>}
  </a></li>)}
 </ul>;
}

export default function HomeBadges(){return <BadgeStrip badges={HOME_BADGES} id="project-records" label="Project links"/>;}
