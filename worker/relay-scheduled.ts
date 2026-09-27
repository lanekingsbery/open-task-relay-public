/** Private Cron adapter. No HTTP entrypoint, inference, transport or action authority. */
import {runRelayShadow} from '../lib/relay-shadow.ts';
import type {RelayDatabase} from '../lib/relay-state.ts';

export const RELAY_SHADOW_CRON='0 * * * *';
const hourMs=3_600_000;
type ShadowEnv=Partial<RelaySchedulerBindings>&{DB:RelayDatabase};
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
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`relay:scheduled-shadow:v1:${event.cron}:${event.scheduledTime}`));
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
    event.scheduledTime%hourMs!==0||event.scheduledTime>now||now-event.scheduledTime>=hourMs)fail('INVALID_SCHEDULED_WAKE');
  let result;
  try {
    const wakeId=await relayScheduledWakeId(event);
    result=await runRelayShadow(env.DB,{wake_id:wakeId,source_version:source,trigger:'scheduled_shadow'});
  } catch {fail('SHADOW_FAILED')}
  if(result.executable!==false||!completed.has(result.code))fail(failures.has(result.code)?result.code:'SHADOW_FAILED');
  report(result.code);
}
