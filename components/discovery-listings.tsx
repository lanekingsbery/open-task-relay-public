'use client';
import {useState} from 'react';
import {DISCOVERY_LISTINGS,type DiscoveryListing} from '@/lib/project-links';

function ProviderBadge({badge}:{badge:NonNullable<DiscoveryListing['badge']>}){
 const [failed,setFailed]=useState(false);
 return <span className="discovery-badge" style={{width:badge.width,height:badge.height}}>
  {failed?<span>Badge unavailable</span>:
   // Fetch the provider's original image directly, without an image proxy.
   // eslint-disable-next-line @next/next/no-img-element
   <img src={badge.src} alt={badge.alt} width={badge.width} height={badge.height} loading="lazy" decoding="async" referrerPolicy="no-referrer" ref={image=>{if(image?.complete&&image.naturalWidth===0)setFailed(true)}} onError={()=>setFailed(true)}/>}
 </span>;
}

export default function DiscoveryListings(){return <ul className="discovery-listings">
 {DISCOVERY_LISTINGS.map(listing=><li key={listing.name}>
  <a href={listing.url} rel="noopener noreferrer"><span>{listing.name}</span>{listing.badge&&<ProviderBadge badge={listing.badge}/>}</a>
  <p>{listing.description}</p>
 </li>)}
</ul>}
