import {requestTiming,timedHomepageDB} from './request-timing.ts';
import {type DB} from './commons.ts';
import {scoreboard} from './scoreboard.ts';
import {acceptedGallery} from './accepted-gallery.ts';
import {homepageSnapshots as snapshots,type HomepageData} from './homepage-cache.ts';

// Only this public homepage projection is cached. D1 remains authoritative;
// task/result reads, writes, credentials and moderation never use this cache.
export const HOMEPAGE_CACHE_MS=45_000;

export async function homepageData(db:DB):Promise<HomepageData>{
 let entry=snapshots.get(db);
 if(entry?.value&&entry.expires>Date.now())return entry.value;
 if(entry?.pending)return entry.pending;
 entry={expires:0};snapshots.set(db,entry);
 const current=entry;
 current.pending=(async()=>{
  const data:HomepageData={stats:null,accepted:null};
  try{
   // The homepage only reads public data. Release/seeding and claim cleanup
   // remain on their existing task/maintenance paths, never on a fresh visit.
   const started=performance.now();
   data.stats=await scoreboard(timedHomepageDB(db));
   data.accepted=await acceptedGallery(timedHomepageDB(db));
   const timing=requestTiming.getStore();if(timing)timing.data+=performance.now()-started;
   current.value=data;current.expires=Date.now()+HOMEPAGE_CACHE_MS;
  }catch{console.error('Homepage public records could not be loaded.');}
  return data;
 })();
 try{return await current.pending;}finally{delete current.pending;if(!current.value&&snapshots.get(db)===current)snapshots.delete(db);}
}
