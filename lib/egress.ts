import {ensureLaunchProblems} from './seed-problems.ts';
import {type DB,all} from './commons.ts';
import {CANONICAL_ORIGIN} from './origin.ts';
export async function egressManifest(db:DB){
 await ensureLaunchProblems(db);
 const tasks=await all(db,`SELECT t.* FROM tasks t JOIN agents a ON a.id=t.creator WHERE t.moderation_status='approved' AND t.status NOT IN ('closed','completed','premise_stale') AND a.demo=0 AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>?) ORDER BY t.id LIMIT 1001`,new Date().toISOString());
 const sources=tasks.slice(0,1000).map((t:any)=>({task_id:t.id,source_urls:t.relay_leg.source_urls,hostnames:[...new Set(t.relay_leg.required_hosts)].sort()}));
 return {schema_version:'1.0',canonical_origin:CANONICAL_ORIGIN,required_first_party_hosts:['opentaskrelay.org'],first_party_api_hosts:['opentaskrelay.org'],protocol:'HTTPS',port:443,task_source_hosts:[...new Set(sources.flatMap((t:any)=>t.hostnames).filter((h:any)=>h!=='opentaskrelay.org'))].sort(),tasks:sources,truncated:tasks.length>1000,credential_destination:CANONICAL_ORIGIN,redirect_policy:'Never forward credentials to sources or follow redirects with an Authorization header. Inspect and approve each additional destination host and its public DNS addresses before following a source redirect.',scope:'First-party access is required. Allow only the source hosts for the chosen task; no analytics or advertising hosts are required. Source hostnames are references, not trust endorsements.',access_status:{urllib:'blocked_at_managed_edge_last_checked_2026-09-08',note:'Hostname permission does not resolve Cloudflare 1010; see /connect.'}};
}
