import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {shadowFixture as fixture} from './relay-shadow-fixture.mjs';
import {runRelayShadow,validateRelayShadowProposal,RELAY_SHADOW_LIMITS} from '../lib/relay-shadow.ts';
import {acquireRelayRun} from '../lib/relay-state.ts';
import {evaluateRelayProposal} from '../lib/relay-executor.ts';
import {RELAY_POLICY_VERSION,RELAY_ACTIONS} from '../lib/relay-policy.ts';
const source='b'.repeat(40),secret='PRIVATE_SHADOW_SENTINEL_DO_NOT_COPY';
const wake=()=>({wake_id:crypto.randomUUID(),source_version:source});

for(const engine of ['sqlite','d1']) {
  test(`${engine}: concurrent shadow wakes record one private proposal and replay without any canonical writes`,async t=>{
    const {db,all,id,count,snapshot}=await fixture(t,engine),input=wake(),before=await snapshot();
    t.mock.method(globalThis,'fetch',()=>assert.fail('OUTBOUND_FORBIDDEN'));
    const outputs=await Promise.all(Array.from({length:10},()=>runRelayShadow(db,input)));
    assert.equal(outputs.filter(r=>r.code==='PROPOSED').length,1);
    assert.ok(outputs.every(r=>['PROPOSED','LEASE_BUSY','REPLAYED'].includes(r.code)),JSON.stringify(outputs));
    assert.equal(await count('relay_observations'),1);assert.equal(await count('relay_actions'),1);
    const [a]=await all('SELECT * FROM relay_actions');
    assert.equal(a.outcome,'denied');assert.equal(a.error_code,'RELAY_DISABLED');assert.equal(a.policy_id,'review_task_inventory');
    assert.deepEqual(JSON.parse(a.target),[{kind:'task',id}]);assert.equal(a.provider,null);assert.equal(a.model,null);
    assert.equal((await runRelayShadow(db,input)).code,'REPLAYED');
    assert.equal((await runRelayShadow(db,{...input,source_version:'c'.repeat(40)})).code,'IDEMPOTENCY_CONFLICT');
    assert.equal(await count('relay_actions'),1);
    assert.equal(await snapshot(),before);assert.equal(await count('mutation_guards'),0);
    for(const table of ['relay_observations','relay_actions','relay_runs'])assert.ok(!JSON.stringify(await all('SELECT * FROM '+table)).includes(secret));
    for(const table of ['relay_budget','relay_approvals'])assert.equal(await count(table),0);
    assert.equal(globalThis.fetch.mock.callCount(),0);
  });
  test(`${engine}: expired lease recovery fences old work and cannot release the replacement lease`,async t=>{
    const {db,count}=await fixture(t,engine),old=await acquireRelayRun(db,source);
    await db.prepare('UPDATE relay_leases SET expires_at=0').run();
    const batch=db.batch.bind(db);let replacement;
    db.batch=async statements=>{
      // Acquisition has no observation INSERT; the final commit has seven statements.
      if(statements.length===7&&!replacement){await db.prepare('UPDATE relay_leases SET expires_at=0').run();replacement=await acquireRelayRun(db,source)}
      return batch(statements);
    };
    assert.equal((await runRelayShadow(db,wake())).code,'SHADOW_FAILED');
    assert.equal((await db.prepare('SELECT status FROM relay_runs WHERE run_id=?').bind(old.run_id).first()).status,'expired');
    assert.equal(await count('relay_observations'),0);assert.equal(await count('relay_actions'),0);
    const lease=await db.prepare('SELECT * FROM relay_leases').first();
    assert.equal(lease.run_id,replacement.run_id);assert.ok(lease.expires_at>Date.now());
    assert.equal((await db.prepare('SELECT status FROM relay_runs WHERE run_id=?').bind(replacement.run_id).first()).status,'running');
  });
  test(`${engine}: late audit failure rolls back observation/check state and same wake can retry`,async t=>{
    const {db,count,snapshot}=await fixture(t,engine),input=wake(),before=await snapshot();
    await db.prepare(`CREATE TRIGGER reject_shadow BEFORE INSERT ON relay_actions BEGIN SELECT RAISE(ABORT,'${secret}'); END`).run();
    assert.deepEqual(await runRelayShadow(db,input),{code:'SHADOW_FAILED',executable:false});
    for(const table of ['relay_observations','relay_actions','relay_check_state','mutation_guards'])assert.equal(await count(table),0);
    assert.equal((await db.prepare('SELECT status FROM relay_runs').first()).status,'failed');
    assert.equal((await db.prepare('SELECT error_code FROM relay_runs').first()).error_code,'SHADOW_FAILED');
    await db.prepare('DROP TRIGGER reject_shadow').run();
    assert.equal((await runRelayShadow(db,input)).code,'PROPOSED');
    assert.equal(await count('relay_actions'),1);assert.equal(await snapshot(),before);
  });
}

test('empty and ineligible windows complete privately without proposals; sampling stops at 25',async t=>{
  const {db,count,agent}=await fixture(t);
  await db.prepare("UPDATE tasks SET moderation_status='pending'").run();
  assert.equal((await runRelayShadow(db,wake())).code,'NO_CANDIDATE');
  assert.equal(await count('relay_actions'),0);assert.equal(await count('relay_observations'),1);
  await db.prepare("UPDATE tasks SET moderation_status='approved'").run();
  await db.prepare('UPDATE agents SET managed=0 WHERE id=?').bind(agent).run();
  assert.equal((await runRelayShadow(db,wake())).code,'NO_CANDIDATE');
  await db.prepare('UPDATE agents SET managed=1,demo=1 WHERE id=?').bind(agent).run();
  assert.equal((await runRelayShadow(db,wake())).code,'NO_CANDIDATE');
  await db.prepare('UPDATE agents SET demo=0 WHERE id=?').bind(agent).run();
  await db.prepare("UPDATE tasks SET created_at=?").bind(new Date().toISOString()).run();
  for(let i=0;i<25;i++)await db.prepare(`INSERT INTO tasks(id,creator,created_at,title,description,required_capabilities,updated_at,protocol,moderation_status)
    VALUES (?, ?, ?, 'fixture','fixture','[]',?, '{"revision":1}','approved')`).bind(crypto.randomUUID(),agent,
      i===24?'2020-01-01T00:00:00.000Z':new Date().toISOString(),new Date().toISOString()).run();
  assert.equal((await runRelayShadow(db,wake())).code,'NO_CANDIDATE');
  assert.equal(await count('relay_actions'),0);
});

test('shadow proposal validation rejects invalid bindings, extra fields, stale and unauthorized actions',async t=>{
  const {db,id,count}=await fixture(t),fence=await acquireRelayRun(db,source),now=Date.now(),hash='a'.repeat(64);
  const observationId=crypto.randomUUID();
  const candidate={id,revision:1,created_at:'2025-01-01T00:00:00.000Z'};
  const p={action_id:'review_task_inventory',policy_version:RELAY_POLICY_VERSION,targets:[{kind:'task',id}],expected_revision:1,
    evidence_refs:[{kind:'observation',id:observationId}],evidence_hash:hash,observed_at:now,expires_at:now+10000,
    run_id:fence.run_id,lease_generation:fence.generation,action_key:observationId};
  const validate=p=>validateRelayShadowProposal(p,candidate,fence,hash,observationId,now);
  assert.equal(validate(p),'RELAY_DISABLED');
  for(const patch of [{enabled:true},{expected_revision:2},{evidence_hash:'c'.repeat(64)},{targets:[]},{run_id:crypto.randomUUID()},
    {lease_generation:900},{approval_id:crypto.randomUUID()},{evidence_refs:[]},{evidence_refs:[{kind:'observation',id:crypto.randomUUID()}]},{action_key:crypto.randomUUID()},{private_text:secret}])assert.equal(validate({...p,...patch}),'INVALID_PROPOSAL');
  assert.equal(validate({...p,expires_at:now}),'STALE_EVIDENCE');
  for(const action_id of [...Object.keys(RELAY_ACTIONS),'claim_task','create_task','submit_review','post_publicly','external_write']){
    if(action_id==='review_task_inventory')continue;
    assert.notEqual(validate({...p,action_id}),'RELAY_DISABLED');
    const denial=await evaluateRelayProposal(db,JSON.stringify({...p,action_id,action_key:crypto.randomUUID()}));
    assert.equal(denial.executable,false);
  }
  assert.equal((await db.prepare("SELECT count(*) n FROM relay_actions WHERE outcome!='denied'").first()).n,0);
  assert.equal(await count('relay_approvals'),0);
});

test('timeout returns promptly, suppresses late continuation and never leaks errors',async t=>{
  const {db,count}=await fixture(t),prepare=db.prepare.bind(db);let release;
  db.prepare=query=>{const statement=prepare(query);if(query.startsWith('WITH window'))statement.first=()=>new Promise(resolve=>{release=()=>resolve(null)});return statement};
  t.mock.timers.enable({apis:['setTimeout']});
  const pending=runRelayShadow(db,wake());
  // Advance through async DB/digest setup until the candidate query is in flight.
  for(let i=0;i<30&&!release;i++)await Promise.resolve();
  assert.ok(release);
  t.mock.timers.tick(RELAY_SHADOW_LIMITS.durationMs);
  assert.deepEqual(await pending,{code:'SHADOW_TIMEOUT',executable:false});
  release();for(let i=0;i<20;i++)await Promise.resolve();
  assert.equal(await count('relay_actions'),0);assert.equal(await count('relay_observations'),0);
  assert.equal((await db.prepare('SELECT status FROM relay_runs').first()).status,'failed');
});

test('invalid wakes have no state; only the scheduled adapter imports shadow mode',async t=>{
  const {db,count}=await fixture(t);
  for(const input of [{}, {...wake(),enabled:true},{...wake(),source_version:secret}])assert.equal((await runRelayShadow(db,input)).code,'INVALID_WAKE');
  assert.equal(await count('relay_runs'),0);
  for(const root of ['worker','app','components'])for(const path of readdirSync(root,{recursive:true}).filter(p=>/\.(ts|tsx)$/.test(p)))
    if(root+'/'+path!=='worker/relay-scheduled.ts')assert.doesNotMatch(readFileSync(root+'/'+path,'utf8'),/relay-(shadow|state|executor)/);
});


test('database time fences a delayed commit even when the application clock is behind',async t=>{
  const {db,count}=await fixture(t),realNow=Date.now();
  t.mock.method(Date,'now',()=>realNow-31_000);
  assert.equal((await runRelayShadow(db,wake())).code,'SHADOW_FAILED');
  assert.equal(await count('relay_observations'),0);assert.equal(await count('relay_actions'),0);
  assert.equal(await count('mutation_guards'),0);
});

test('failure after the audit insert rolls back every proposal record and releases only the owned lease',async t=>{
  const {db,count}=await fixture(t),input=wake();
  await db.prepare(`CREATE TRIGGER reject_finish BEFORE UPDATE ON relay_runs WHEN NEW.status='finished'
    BEGIN SELECT RAISE(ABORT,'${secret}'); END`).run();
  assert.deepEqual(await runRelayShadow(db,input),{code:'SHADOW_FAILED',executable:false});
  for(const table of ['relay_observations','relay_actions','relay_check_state','mutation_guards'])assert.equal(await count(table),0);
  assert.equal((await db.prepare('SELECT status FROM relay_runs').first()).status,'failed');
  await db.prepare('DROP TRIGGER reject_finish').run();
  assert.equal((await runRelayShadow(db,input)).code,'PROPOSED');
});
