import {requestTiming,timedHomepageDB} from './request-timing.ts';
import {type DB} from './commons.ts';
import {scoreboard} from './scoreboard.ts';
import {featuredMission} from './public-work.ts';
import {homepageTasks} from './homepage-tasks.ts';
import {homepageSnapshots as snapshots,type HomepageData} from './homepage-cache.ts';
import {projectExpiredClaim} from './task-lease.ts';

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
  const data:HomepageData={stats:null,mission:null,tasks:null};
  try{
   // The homepage only reads public data. Release/seeding and claim cleanup
   // remain on their existing task/maintenance paths, never on a fresh visit.
   // Project expired leases as open without writing to D1 during rendering.
   const started=performance.now(),measured=timedHomepageDB(db);
   const values=await Promise.allSettled([scoreboard(measured),featuredMission(measured,true),homepageTasks(measured)]);
   const timing=requestTiming.getStore();if(timing)timing.data+=performance.now()-started;
   if(values[0].status==='fulfilled')data.stats=values[0].value;
   if(values[1].status==='fulfilled')data.mission=projectExpiredClaim(values[1].value);
   if(values[2].status==='fulfilled')data.tasks=values[2].value;
   if(values.every(v=>v.status==='fulfilled')){
    current.value=data;current.expires=Date.now()+HOMEPAGE_CACHE_MS;
   }else console.error('Some homepage public records could not be loaded.');
  }catch{console.error('Homepage public records could not be loaded.');}
  return data;
 })();
 try{return await current.pending;}finally{delete current.pending;if(!current.value&&snapshots.get(db)===current)snapshots.delete(db);}
}
