/** Private Cron adapter. No HTTP wake or inference; explicit v1 opt-in selects bounded execution. */
import type {ChatInference} from '../lib/relay-inference.ts';
import {runRelayOperator} from '../lib/relay-operator.ts';
import {runRelayShadow} from '../lib/relay-shadow.ts';
import {runScheduledFinishing} from '../lib/relay-finishing.ts';
import type {DB} from '../lib/commons.ts';
import type {RelayDatabase} from '../lib/relay-state.ts';

export const RELAY_SHADOW_CRON='0 * * * *';
const hourMs=3_600_000;
type ShadowEnv=Partial<RelaySchedulerBindings>&Partial<RelayChatBindings>&{AI?:ChatInference;DB:RelayDatabase & DB;ASSETS?:{fetch(request:Request):Promise<Response>}};
type ShadowEvent={cron:string;scheduledTime:number};
const completed=new Set(['PROPOSED','NO_CANDIDATE','REPLAYED','LEASE_BUSY']);
const failures=new Set(['SHADOW_TIMEOUT','SHADOW_FAILED','IDEMPOTENCY_CONFLICT','INVALID_WAKE']);

function report(code:string) {
  // Fixed codes only: no bindings, errors, task contents, identities or credentials.
  console.log(JSON.stringify({event:'relay_scheduled_shadow',code,executable:false}));
}
function fail(code:string):never {
  report(code);
  throw new Error('RELAY_SCHEDULED_SHADOW_FAILED');
}

/** Stable UUIDv8 per Cron slot, independent of deployment. A changed SHA cannot replay as new work. */
export async function relayScheduledWakeId(event:ShadowEvent):Promise<string> {
  // Cloudflare may supply seconds/milliseconds past the hour. Redeliveries share the hourly slot.
  const slot=Math.floor(event.scheduledTime/hourMs)*hourMs;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`relay:scheduled-shadow:v1:${event.cron}:${slot}`));
  const bytes=new Uint8Array(digest).slice(0,16);
  bytes[6]=(bytes[6]&0x0f)|0x80;bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/** Exactly one bounded runner attempt; platform redelivery reuses the same wake, without a retry loop. */
export async function scheduledRelayShadow(event:ShadowEvent,env:ShadowEnv):Promise<void> {
  if(env.RELAY_SELF_HOSTED!=='true'||env.RELAY_SHADOW_ENABLED!=='true'||env.MIGRATION_FREEZE==='true')return;
  const source=env.RELAY_SHADOW_SOURCE_VERSION;
  if(!source||!/^[a-f0-9]{40}$/.test(source))fail('INVALID_SOURCE_VERSION');
  const now=Date.now();
  if(event.cron!==RELAY_SHADOW_CRON||!Number.isSafeInteger(event.scheduledTime)||event.scheduledTime<=0||
    event.scheduledTime>now||now-event.scheduledTime>=hourMs)fail('INVALID_SCHEDULED_WAKE');
  let result;
  try {
    const wakeId=await relayScheduledWakeId(event);
    if(env.RELAY_OPERATOR_ENABLED==='true'){
      let staticHealth:'ok'|'unavailable'='unavailable';
      try{
        const response=await env.ASSETS?.fetch(new Request('https://relay.invalid/favicon.svg',{signal:AbortSignal.timeout(5000)}));
        staticHealth=response?.status===200?'ok':'unavailable';
        await response?.body?.cancel();
      }catch{/* Fixed unavailable signal; never record raw exceptions. */}
      const outcome=await runRelayOperator(env.DB,{wake_id:wakeId,source_version:source,static_health:staticHealth},env.RELAY_CHAT_ENABLED==='true'&&env.AI?{AI:env.AI}:undefined);
      console.log(JSON.stringify({event:'relay_operator',code:outcome.code}));
      if(env.RELAY_RESOLUTION_ENABLED!=='true'){
        console.log(JSON.stringify({event:'relay_resolution',code:'DISABLED'}));
      }else if(outcome.code!=='PAUSED'&&env.RELAY_CHAT_ENABLED==='true'&&env.AI){
        try{const code=('actions' in outcome&&(outcome.actions||0)>=3)?'WAKE_LIMIT':await runScheduledFinishing(env.DB,env.AI,source,event.scheduledTime);console.log(JSON.stringify({event:'relay_resolution',code}));}
        catch{console.log(JSON.stringify({event:'relay_resolution',code:'UNAVAILABLE'}));}
      }
      return;
    }
    result=await runRelayShadow(env.DB,{wake_id:wakeId,source_version:source,trigger:'scheduled_shadow'});
  } catch {fail('SHADOW_FAILED')}
  if(result.executable!==false||!completed.has(result.code))fail(failures.has(result.code)?result.code:'SHADOW_FAILED');
  report(result.code);
}
