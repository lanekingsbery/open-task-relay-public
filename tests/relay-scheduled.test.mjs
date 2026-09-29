import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {scheduledRelayShadow,relayScheduledWakeId,RELAY_SHADOW_CRON} from '../worker/relay-scheduled.ts';
import {acquireRelayRun,finishRelayRun} from '../lib/relay-state.ts';
import {RELAY_SHADOW_LIMITS} from '../lib/relay-shadow.ts';
import {shadowFixture} from './relay-shadow-fixture.mjs';
const source='b'.repeat(40),hour=3_600_000,secret='PRIVATE_SHADOW_SENTINEL_DO_NOT_COPY';
const event=()=>({cron:RELAY_SHADOW_CRON,scheduledTime:Math.floor(Date.now()/hour)*hour});
const env=DB=>({DB,RELAY_SELF_HOSTED:'true',RELAY_SHADOW_ENABLED:'true',RELAY_SHADOW_SOURCE_VERSION:source});
function logs(t) {const records=[];t.mock.method(console,'log',line=>records.push(JSON.parse(line)));return records}

test('wake IDs normalize seconds, milliseconds and delayed timestamps to their supplied UTC hour',async()=>{
 const slot=Date.parse('2026-09-26T12:00:00.000Z'),wake={cron:RELAY_SHADOW_CRON,scheduledTime:slot};
 const id=await relayScheduledWakeId(wake);
 // Preserve the v1 identity of existing exact-hour receipts.
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`relay:scheduled-shadow:v1:${RELAY_SHADOW_CRON}:${slot}`))).slice(0,16);
 bytes[6]=(bytes[6]&0x0f)|0x80;bytes[8]=(bytes[8]&0x3f)|0x80;
 assert.equal(id.replaceAll('-',''),Buffer.from(bytes).toString('hex'));
 for(const offset of [1,56_000,56_789,125_123,hour-1])
   assert.equal(await relayScheduledWakeId({...wake,scheduledTime:slot+offset}),id);
 for(const offset of [-1,hour])assert.notEqual(await relayScheduledWakeId({...wake,scheduledTime:slot+offset}),id);
});

test('freshness uses the original timestamp, including delayed delivery across an hour boundary',async t=>{
 const slot=Date.parse('2026-09-26T12:00:00.000Z'),now=slot+hour+30_000,ids=[],records=logs(t);
 t.mock.method(Date,'now',()=>now);
 const db={prepare(){return {bind(id){ids.push(id);return this},async first(){
   return {source_version:source,status:'finished',run_id:'11111111-1111-4111-8111-111111111111'};
 }}}};
 for(const scheduledTime of [now,now-1,now-hour+1,slot+56_000]) {
   await scheduledRelayShadow({cron:RELAY_SHADOW_CRON,scheduledTime},env(db));
   assert.equal(ids.at(-1),await relayScheduledWakeId({cron:RELAY_SHADOW_CRON,scheduledTime}));
 }
 assert.ok(records.every(r=>r.code==='REPLAYED'));
 const reads=ids.length;
 for(const scheduledTime of [now+1,now-hour,now-hour-1])
   await assert.rejects(scheduledRelayShadow({cron:RELAY_SHADOW_CRON,scheduledTime},env(db)),/RELAY_SCHEDULED_SHADOW_FAILED/);
 assert.equal(ids.length,reads);
});

for(const engine of ['sqlite','d1']) {
 test(`${engine}: offset wakes complete one run and observation per normalized slot`,async t=>{
  const {db,all,count,snapshot}=await shadowFixture(t,engine),before=await snapshot(),wake=event(),records=logs(t);
  const now=Math.max(Date.now(),wake.scheduledTime+125_123);
  t.mock.method(Date,'now',()=>now);
  t.mock.method(globalThis,'fetch',()=>assert.fail('NO_OUTBOUND'));
  await scheduledRelayShadow({...wake,scheduledTime:wake.scheduledTime+56_789},env(db));
  assert.equal(records.at(-1).code,'PROPOSED');
  const [run]=await all('SELECT * FROM relay_runs');
  assert.equal(run.status,'finished');assert.equal(run.trigger,'scheduled_shadow');
  assert.deepEqual(JSON.parse(run.counts),{observations:1,proposals:1,actions:0});
  await Promise.all([0,1,56_000,56_789,125_123].map(offset=>scheduledRelayShadow({...wake,scheduledTime:wake.scheduledTime+offset},env(db))));
  for(const table of ['relay_runs','relay_observations','relay_actions'])assert.equal(await count(table),1);
  assert.equal((await all('SELECT * FROM relay_observations'))[0].id,await relayScheduledWakeId(wake));
  assert.ok(records.slice(1).every(r=>r.code==='REPLAYED'&&r.executable===false));
  await assert.rejects(scheduledRelayShadow(wake,{...env(db),RELAY_SHADOW_SOURCE_VERSION:'c'.repeat(40)}),/RELAY_SCHEDULED_SHADOW_FAILED/);
  assert.equal(await count('relay_runs'),1);assert.equal(await snapshot(),before);
  assert.equal(globalThis.fetch.mock.callCount(),0);
 });
 test(`${engine}: duplicate scheduled wakes share one receipt, source version and denied proposal`,async t=>{
  const {db,all,count,snapshot}=await shadowFixture(t,engine),before=await snapshot(),wake=event(),records=logs(t);
  t.mock.method(globalThis,'fetch',()=>assert.fail('NO_OUTBOUND'));
  await Promise.all(Array.from({length:10},()=>scheduledRelayShadow(wake,env(db))));
  await scheduledRelayShadow(wake,env(db));
  assert.equal(await count('relay_observations'),1);assert.equal(await count('relay_actions'),1);
  const [run]=await all("SELECT * FROM relay_runs WHERE status='finished'");
  assert.equal(run.trigger,'scheduled_shadow');assert.equal(run.source_version,source);
  assert.deepEqual(JSON.parse(run.counts),{observations:1,proposals:1,actions:0});
  const [observation]=await all('SELECT * FROM relay_observations');
  assert.equal(observation.id,await relayScheduledWakeId(wake));
  assert.notEqual(observation.id,await relayScheduledWakeId({...wake,scheduledTime:wake.scheduledTime+hour}));
  const [action]=await all('SELECT * FROM relay_actions');
  assert.equal(action.outcome,'denied');assert.equal(action.error_code,'RELAY_DISABLED');
  assert.equal(action.provider,null);assert.equal(action.model,null);
  assert.ok(records.some(r=>r.code==='REPLAYED'));
  assert.ok(records.every(r=>r.executable===false&&['PROPOSED','REPLAYED','LEASE_BUSY'].includes(r.code)));
  await assert.rejects(scheduledRelayShadow(wake,{...env(db),RELAY_SHADOW_SOURCE_VERSION:'c'.repeat(40)}),/^Error: RELAY_SCHEDULED_SHADOW_FAILED$/);
  assert.equal(await count('relay_observations'),1);assert.equal(await snapshot(),before);
  for(const table of ['relay_budget','relay_approvals','relay_incidents','mutation_guards'])assert.equal(await count(table),0);
  for(const table of ['relay_runs','relay_observations','relay_actions'])assert.ok(!JSON.stringify(await all('SELECT * FROM '+table)).includes(secret));
  assert.ok(!JSON.stringify(records).includes(secret));assert.equal(globalThis.fetch.mock.callCount(),0);
 });
 test(`${engine}: overlap skips an active lease, then recovers the stale lease and fences old work`,async t=>{
  const {db,count}=await shadowFixture(t,engine),old=await acquireRelayRun(db,source),records=logs(t);
  await scheduledRelayShadow(event(),env(db));
  assert.equal(records.at(-1).code,'LEASE_BUSY');assert.equal(await count('relay_observations'),0);
  await db.prepare('UPDATE relay_leases SET expires_at=0').run();
  await scheduledRelayShadow(event(),env(db));
  assert.equal(records.at(-1).code,'PROPOSED');
  assert.equal((await db.prepare('SELECT status FROM relay_runs WHERE run_id=?').bind(old.run_id).first()).status,'expired');
  assert.equal((await db.prepare('SELECT generation FROM relay_leases').first()).generation,old.generation+1);
  await assert.rejects(finishRelayRun(db,old),/CHECK constraint/);
  assert.equal(await count('relay_observations'),1);
 });
 test(`${engine}: audit failure rolls back, reports only a fixed error and retries the same wake`,async t=>{
  const {db,count,snapshot}=await shadowFixture(t,engine),before=await snapshot(),wake=event(),records=logs(t);
  await db.prepare(`CREATE TRIGGER reject_finish BEFORE UPDATE ON relay_runs WHEN NEW.status='finished'
    BEGIN SELECT RAISE(ABORT,'${secret}'); END`).run();
  await assert.rejects(scheduledRelayShadow(wake,env(db)),/^Error: RELAY_SCHEDULED_SHADOW_FAILED$/);
  assert.deepEqual(records,[{event:'relay_scheduled_shadow',code:'SHADOW_FAILED',executable:false}]);
  for(const table of ['relay_observations','relay_actions','relay_check_state','mutation_guards'])assert.equal(await count(table),0);
  assert.equal((await db.prepare('SELECT status FROM relay_runs').first()).status,'failed');
  await db.prepare('DROP TRIGGER reject_finish').run();
  await scheduledRelayShadow(wake,env(db));
  assert.equal(await count('relay_observations'),1);assert.equal(await snapshot(),before);
 });
}

test('disabled/frozen installs never touch D1; malformed source/events fail closed before D1',async t=>{
 const db={prepare(){assert.fail('D1_UNREACHABLE')},batch(){assert.fail('D1_UNREACHABLE')}},records=logs(t);
 for(const bindings of [{DB:db},{...env(db),RELAY_SHADOW_ENABLED:'false'},{...env(db),RELAY_SELF_HOSTED:'false'},
   {...env(db),MIGRATION_FREEZE:'true'}])await scheduledRelayShadow(event(),bindings);
 assert.deepEqual(records,[]);
 for(const sourceVersion of [undefined,'',secret,'b'.repeat(39)])
   await assert.rejects(scheduledRelayShadow(event(),{...env(db),RELAY_SHADOW_SOURCE_VERSION:sourceVersion}),/RELAY_SCHEDULED_SHADOW_FAILED/);
 for(const patch of [{cron:'* * * * *'},{scheduledTime:0},{scheduledTime:NaN},{scheduledTime:event().scheduledTime+hour},
   {scheduledTime:event().scheduledTime-hour},{scheduledTime:Infinity},{scheduledTime:-1},
   {scheduledTime:Date.now()-0.5},{scheduledTime:Number.MAX_SAFE_INTEGER+1},{scheduledTime:String(Date.now())}])
   await assert.rejects(scheduledRelayShadow({...event(),...patch},env(db)),/RELAY_SCHEDULED_SHADOW_FAILED/);
 assert.ok(!JSON.stringify(records).includes(secret));
});

test('scheduled timeout fails the event within the runner bound and prevents delayed writes',async t=>{
 const {db,count}=await shadowFixture(t),prepare=db.prepare.bind(db),records=logs(t);let release;
 db.prepare=query=>{const statement=prepare(query);if(query.startsWith('WITH window'))statement.first=()=>new Promise(resolve=>{release=()=>resolve(null)});return statement};
 // WebCrypto completes on the real event loop while only the deadline timer is faked.
 const wake=event();
 t.mock.timers.enable({apis:['setTimeout']});
 const pending=scheduledRelayShadow(wake,env(db));
 const rejected=assert.rejects(pending,/RELAY_SCHEDULED_SHADOW_FAILED/);
 for(let i=0;i<50&&!release;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.ok(release);t.mock.timers.tick(RELAY_SHADOW_LIMITS.durationMs);await rejected;
 release();for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(await count('relay_observations'),0);assert.equal(await count('relay_actions'),0);
 assert.equal(records.at(-1).code,'SHADOW_TIMEOUT');
});

test('built Worker dispatches Cron privately; HTTP cannot wake or expose Relay; no outbound effects',async t=>{
 const outbound=[];
 const mf=new Miniflare(convertV4MiniflareOptions({
   modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),
   modulesRoot:'dist/server',compatibilityDate:'2026-09-07',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],
   bindings:{RELAY_SELF_HOSTED:'true',RELAY_SHADOW_ENABLED:'true',RELAY_SHADOW_SOURCE_VERSION:source},
   serviceBindings:{ASSETS:async()=>new Response('not found',{status:404})},
   outboundService:request=>{outbound.push(request.url);throw new Error('NO_OUTBOUND')},
 }));
 t.after(()=>mf.dispose());const db=await mf.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())
   for(const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(statement).run();
 // Exercise the built handler with sub-hour timestamp data and a distinct same-slot redelivery.
 const worker=await mf.getWorker(),wake={cron:RELAY_SHADOW_CRON,scheduledTime:Date.now()-1000};
 // Leave at least one millisecond before the next slot for the redelivery below.
 if(wake.scheduledTime%hour===hour-1)wake.scheduledTime--;
 assert.equal((await worker.scheduled(wake)).outcome,'ok');
 assert.equal((await worker.scheduled({...wake,scheduledTime:wake.scheduledTime+1})).outcome,'ok');
 const receipt=await db.prepare('SELECT * FROM relay_observations').first();assert.ok(receipt);
 assert.equal(receipt.id,await relayScheduledWakeId(wake));
 const runs=(await db.prepare('SELECT * FROM relay_runs').all()).results;
 assert.equal(runs.length,1);assert.equal(runs[0].status,'finished');
 assert.deepEqual(JSON.parse(runs[0].counts),{observations:1,proposals:0,actions:0});
 const before=JSON.stringify((await db.prepare('SELECT * FROM relay_runs').all()).results);
 for(const path of ['/api/relay','/api/relay/shadow','/api/relay/wake','/api/v1/relay_runs','/api/v1/relay_observations','/api/v1/relay_actions'])
   for(const method of ['GET','HEAD','POST']) {
     const response=await mf.dispatchFetch('https://opentaskrelay.org'+path,{method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{})});
     assert.ok([401,403,404,405].includes(response.status),path+' '+response.status);
     assert.ok(!(await response.text()).includes(receipt.id));
   }
 assert.equal(JSON.stringify((await db.prepare('SELECT * FROM relay_runs').all()).results),before);
 assert.equal((await db.prepare('SELECT count(*) n FROM relay_observations').first()).n,1);
 for(const table of ['tasks','results','messages','verifications','relay_actions','relay_approvals','relay_budget'])
   assert.equal((await db.prepare('SELECT count(*) n FROM '+table).first()).n,0);
 assert.deepEqual(outbound,[]);
});

test('operator replay keeps the supplied resolution slot and respects a later owner pause',async t=>{
 const {db}=await shadowFixture(t,'d1'),records=logs(t);
 const slot=Math.floor(Date.now()/hour)*hour,wake={cron:RELAY_SHADOW_CRON,scheduledTime:slot+60000};
 let now=slot+60000;t.mock.method(Date,'now',()=>now);
 // Isolate the adapter from operator transaction wall-clock checks with a saved wake.
 const prepare=db.prepare.bind(db),slots=[];
 db.prepare=query=>{
  if(query==='SELECT id FROM relay_observations WHERE id=?')return {bind(){return this},async first(){return {id:'saved-wake'}}};
  if(query==='SELECT result_id FROM relay_resolution_assessments WHERE wake_slot>=?')return {
   bind(value){slots.push(value);return this},async first(){return {result_id:'already-claimed'}}};
  return prepare(query);
 };
 const bindings={...env(db),RELAY_OPERATOR_ENABLED:'true',RELAY_CHAT_ENABLED:'true',RELAY_RESOLUTION_ENABLED:'true',AI:{run(){assert.fail('No paid inference')}}};
 await scheduledRelayShadow(wake,bindings);now=slot+hour+1;await scheduledRelayShadow(wake,bindings);
 assert.deepEqual(slots,[slot,slot]);
 await db.prepare('UPDATE relay_operator_control SET enabled=0 WHERE id=1').run();
 await scheduledRelayShadow(wake,bindings);
 assert.equal(records.at(-1).code,'PAUSED');assert.deepEqual(slots,[slot,slot]);
});
