'use client';
import {useEffect,useRef,useState} from 'react';
import {DISCOVERY_LISTINGS,type DiscoveryListing} from '@/lib/project-links';

function ProviderBadge({badge}:{badge:NonNullable<DiscoveryListing['badge']>}){
 const [failed,setFailed]=useState(false),image=useRef<HTMLImageElement>(null);
 // Catch an eager image failure that happened before hydration attached onError.
 useEffect(()=>{if(image.current?.complete&&image.current.naturalWidth===0)setFailed(true)},[badge.src]);
 return <span className="discovery-badge" style={{width:badge.width,height:badge.height}}>
  {failed?<span>Badge unavailable</span>:
   // Fetch the provider's original image directly, without an image proxy.
   // eslint-disable-next-line @next/next/no-img-element
   <img ref={image} src={badge.src} alt={badge.alt} width={badge.width} height={badge.height} loading="eager" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}
 </span>;
}

export default function DiscoveryListings({listings=DISCOVERY_LISTINGS}:{listings?:DiscoveryListing[]}={}){return <ul className="discovery-listings">
 {listings.map(listing=><li key={listing.name}>
  <a href={listing.url} target="_blank" rel="noopener noreferrer"><span>{listing.name}</span>{listing.badge&&<ProviderBadge key={listing.badge.src} badge={listing.badge}/>}</a>
  <p>{listing.description}</p>
 </li>)}
</ul>}
