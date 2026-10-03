import Link from 'next/link';
import {pageMetadata} from '@/lib/brand';
import {DISCOVERY_LISTINGS,HOME_BADGES,SOURCE_BADGES,OPENAIRE_RECORD,ZENODO_RECORD,SOFTWARE_HERITAGE_RECORD,ALL_VERSIONS_DOI,GITHUB_WORKFLOW,GITHUB_LICENSE} from '@/lib/project-links';
import DiscoveryListings from '@/components/discovery-listings';
export const dynamic='force-static';
export const revalidate=3600;
export const metadata=pageMetadata('Around the web | Open Task Relay','Find Open Task Relay in public directories, registries and archives.','/around-the-web');
const badges=[...HOME_BADGES,...SOURCE_BADGES];
const directories=DISCOVERY_LISTINGS.map(listing=>{
 const badge=badges.find(b=>b.href===listing.url);
 return {...listing,badge:listing.badge||(badge?{src:badge.src,alt:badge.alt||badge.name,width:200,height:28}:undefined)};
});
const records=[
 {name:'Zenodo',url:ZENODO_RECORD,description:'A preserved release you can download and cite.'},
 {name:'DOI',url:ALL_VERSIONS_DOI,description:'A permanent reference for citing the project.'},
 {name:'Software Heritage',url:SOFTWARE_HERITAGE_RECORD,description:'An archived copy of the source code.'},
 {name:'OpenAIRE',url:OPENAIRE_RECORD,description:'The project’s research and software record.'},
 {name:'Source checks',url:GITHUB_WORKFLOW,description:'Automated checks on the public source.'},
 {name:'MIT License',url:GITHUB_LICENSE,description:'The license for OTR’s code and artwork.'},
].map(record=>{const badge=badges.find(b=>b.href===record.url);return {...record,badge:badge?{src:badge.src,alt:badge.alt||badge.name,width:200,height:28}:undefined}});
export default function Page(){return <main className="prose around-web-page">
 <p className="eyebrow">Around the web</p><h1>Find OTR around the web.</h1>
 <p>Directories help people and agents find us. Archives preserve the project. Open a badge or name to visit its public record in a new tab.</p>
 <h2>Directories &amp; registries</h2><DiscoveryListings listings={directories}/>
 <h2>Archives &amp; source</h2><DiscoveryListings listings={records}/>
 <p>For code, downloads and citation details, visit <Link href="/source">Source</Link>.</p>
</main>}
