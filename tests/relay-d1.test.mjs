import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {acquireRelayRun,finishRelayRun} from '../lib/relay-state.ts';
import {evaluateRelayProposal} from '../lib/relay-executor.ts';
import {RELAY_POLICY_VERSION} from '../lib/relay-policy.ts';

test('D1 engine serializes overlapping leases and rolls back a failing incident/audit batch',async t=>{
  const outbound=[];
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("test only")}}',
    compatibilityDate:'2026-09-07',d1Databases:['DB'],outboundService:async request=>{outbound.push(request.url);throw new Error('No external calls allowed')}}));
  t.after(()=>mf.dispose());
  const db=await mf.getD1Database('DB');
  // Only the prerequisite guard and pending additive migration, on an isolated local D1.
  await db.prepare('CREATE TABLE mutation_guards(id TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1))').run();
  for(const statement of readFileSync('drizzle/0012_relay_private_state.sql','utf8').split('--> statement-breakpoint').filter(s=>s.trim()))
    await db.prepare(statement).run();
  const attempts=await Promise.all(Array.from({length:10},()=>acquireRelayRun(db,'b'.repeat(40))));
  assert.equal(attempts.filter(Boolean).length,1);
  const fence=attempts.find(Boolean);
  const p={action_id:'expire_claims',policy_version:RELAY_POLICY_VERSION,targets:[],expected_revision:1,evidence_refs:[],
    evidence_hash:'a'.repeat(64),observed_at:Date.now(),expires_at:Date.now()+30000,run_id:fence.run_id,
    lease_generation:fence.generation,action_key:crypto.randomUUID()};
  const results=await Promise.all(Array.from({length:8},()=>evaluateRelayProposal(db,JSON.stringify(p))));
  assert.ok(results.every(r=>r.code==='RELAY_DISABLED'));
  assert.equal((await db.prepare('SELECT count(*) n FROM relay_actions').first()).n,1);
  await db.prepare("CREATE TRIGGER reject_audit BEFORE INSERT ON relay_actions BEGIN SELECT RAISE(ABORT,'injected audit failure'); END").run();
  await assert.rejects(evaluateRelayProposal(db,JSON.stringify({...p,action_id:'unapproved_tool',action_key:crypto.randomUUID()})),/injected audit failure/);
  assert.equal((await db.prepare('SELECT count(*) n FROM relay_incidents').first()).n,0);
  await db.prepare('DROP TRIGGER reject_audit').run();
  // Incident classification is independent of the stale-evidence denial in D1 as well.
  const staleUnknown={...p,action_id:'unapproved_tool',observed_at:Date.now()-100_000,action_key:crypto.randomUUID()};
  assert.equal((await evaluateRelayProposal(db,JSON.stringify(staleUnknown))).code,'STALE_EVIDENCE');
  assert.equal((await db.prepare('SELECT count(*) n FROM relay_incidents').first()).n,1);
  assert.equal((await evaluateRelayProposal(db,JSON.stringify({...p,action_id:'unapproved_tool',action_key:crypto.randomUUID()}))).code,'UNKNOWN_ACTION');
  assert.equal((await db.prepare('SELECT count(*) n FROM relay_incidents').first()).n,1);
  await db.prepare('UPDATE relay_leases SET expires_at=0').run();
  const next=await acquireRelayRun(db,'b'.repeat(40));
  await assert.rejects(finishRelayRun(db,fence),/CHECK constraint/);
  assert.equal((await evaluateRelayProposal(db,JSON.stringify({...p,action_key:crypto.randomUUID()}))).code,'FENCE_LOST');
  await finishRelayRun(db,next);
  assert.equal((await db.prepare('SELECT count(*) n FROM mutation_guards').first()).n,0);
  assert.equal(outbound.length,0);
  // No runtime file imports the operator; no paid binding exists in this worker.
  for(const path of readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')))
    assert.doesNotMatch(readFileSync('dist/server/'+path,'utf8'),/PR2_DENIAL_ONLY|INSERT INTO relay_leases/);
});

test('built Worker on public defaults cannot activate Relay or proposal publication and makes zero outbound calls',async t=>{
  const outbound=[];
  const mf=new Miniflare(convertV4MiniflareOptions({
    modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')]
      .map(f=>({type:'ESModule',path:'dist/server/'+f})),
    modulesRoot:'dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
    d1Databases:['DB'],bindings:{},serviceBindings:{ASSETS:async()=>new Response(null,{status:404})},
    outboundService:async request=>{outbound.push(request.url);throw new Error('No outbound call permitted')},
  }));
  t.after(()=>mf.dispose());
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())
    for(const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))
      await db.prepare(statement).run();
  assert.equal((await mf.dispatchFetch('https://fork.example.test/api/health')).status,200);
  for(const path of ['/api/v1/tasks','/api/tasks']) {
    const response=await mf.dispatchFetch('https://fork.example.test'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,410);
  }
  for(const path of ['/api/v1/task-proposals','/api/relay/ask']) {
    const response=await mf.dispatchFetch('https://fork.example.test'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.ok([401,404,405].includes(response.status));
  }
  for(const table of ['relay_runs','relay_actions','relay_approvals','relay_budget'])
    assert.equal((await db.prepare('SELECT count(*) n FROM '+table).first()).n,0);
  assert.deepEqual(outbound,[]);
});
