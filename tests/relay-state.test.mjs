import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {acquireRelayRun,finishRelayRun} from '../lib/relay-state.ts';
import {evaluateRelayProposal,relayApprovalHash} from '../lib/relay-executor.ts';
import {RELAY_POLICY_VERSION,RELAY_ACTIONS} from '../lib/relay-policy.ts';

const source='b'.repeat(40);
function fixture(t) {
  const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
  sql.exec('PRAGMA foreign_keys=ON');
  for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
  const db={prepare(query){let args=[];return {bind(...values){args=values;return this},
    async first(){return sql.prepare(query).get(...args)??null},
    async run(){return sql.prepare(query).run(...args)},
    sync(){return sql.prepare(query).run(...args)}}},
    async batch(statements){sql.exec('BEGIN');try{const rows=statements.map(s=>s.sync());sql.exec('COMMIT');return rows}catch(e){sql.exec('ROLLBACK');throw e}}};
  return {sql,db};
}
function proposal(fence,patch={}){return {action_id:'expire_claims',policy_version:RELAY_POLICY_VERSION,
  targets:[{kind:'task',id:crypto.randomUUID()}],expected_revision:1,evidence_refs:[],evidence_hash:'a'.repeat(64),
  observed_at:Date.now()-5,expires_at:Date.now()+30_000,run_id:fence.run_id,lease_generation:fence.generation,
  action_key:crypto.randomUUID(),...patch};}
const evaluate=(db,p)=>evaluateRelayProposal(db,JSON.stringify(p));

test('overlapping runners have one lease; expiry and completion fence out old generations',async t=>{
  const {db,sql}=fixture(t);
  const runs=await Promise.all(Array.from({length:10},()=>acquireRelayRun(db,source)));
  assert.equal(runs.filter(Boolean).length,1);
  const first=runs.find(Boolean);
  sql.exec("UPDATE relay_leases SET expires_at=0");
  const next=await acquireRelayRun(db,source);assert.equal(next.generation,first.generation+1);
  await assert.rejects(finishRelayRun(db,first),/CHECK constraint/);
  assert.equal((await evaluate(db,proposal(first))).code,'FENCE_LOST');
  await finishRelayRun(db,next);
  assert.equal((await evaluate(db,proposal(next))).code,'FENCE_LOST');
  assert.equal((await acquireRelayRun(db,source)).generation,next.generation+1);
  assert.equal(sql.prepare('SELECT count(*) n FROM mutation_guards').get().n,0);
});

test('all manifest actions deny with no fetch, AI, canonical mutation or approval issuance',async t=>{
  const {db,sql}=fixture(t),fence=await acquireRelayRun(db,source);
  t.mock.method(globalThis,'fetch',()=>{throw new Error('EXTERNAL_CALL_FORBIDDEN')});
  for(const action of Object.keys(RELAY_ACTIONS)) {
    const r=await evaluate(db,proposal(fence,{action_id:action}));assert.equal(r.executable,false);
    assert.notEqual(r.code,'INVALID_PROPOSAL');
  }
  assert.equal(globalThis.fetch.mock.callCount(),0);
  for(const table of ['tasks','messages','results','verifications','relay_budget','relay_approvals'])
    assert.equal(sql.prepare('SELECT count(*) n FROM '+table).get().n,0);
  assert.equal(sql.prepare("SELECT count(*) n FROM relay_actions WHERE outcome!='denied'").get().n,0);
});

test('identical retries and racing changed payloads are deduplicated and audited',async t=>{
  const {db,sql}=fixture(t),p=proposal(await acquireRelayRun(db,source));
  const identical=await Promise.all(Array.from({length:8},()=>evaluate(db,p)));
  assert.ok(identical.every(r=>r.code==='RELAY_DISABLED'));
  assert.equal(sql.prepare('SELECT count(*) n FROM relay_actions').get().n,1);
  const collision=await evaluate(db,{...p,expected_revision:2});assert.equal(collision.code,'IDEMPOTENCY_CONFLICT');
  assert.equal(sql.prepare('SELECT count(*) n FROM relay_actions').get().n,2);
  const fresh=proposal({run_id:p.run_id,generation:p.lease_generation});
  const race=await Promise.all([evaluate(db,fresh),evaluate(db,{...fresh,expected_revision:2})]);
  assert.deepEqual(race.map(r=>r.code).sort(),['IDEMPOTENCY_CONFLICT','RELAY_DISABLED']);
});

test('malicious, oversized, stale and unknown inputs store only bounded references and digests',async t=>{
  const {db,sql}=fixture(t),fence=await acquireRelayRun(db,source),p=proposal(fence);
  const secret='PRIVATE_BODY_MUST_NEVER_BE_LOGGED';
  for(const raw of ['not json',JSON.stringify({...p,owner_actor:secret}),JSON.stringify({...p,enabled:true}),
    JSON.stringify({...p,targets:[{kind:'task',id:secret}]}),'x'.repeat(17000)])
    assert.equal((await evaluateRelayProposal(db,raw)).code,'INVALID_PROPOSAL');
  for(const patch of [{observed_at:Date.now()+1000},{observed_at:Date.now()-100000},{expires_at:0}])
    assert.equal((await evaluate(db,proposal(fence,patch))).code,'STALE_EVIDENCE');
  // A stale unknown action still produces the same deduplicated owner incident.
  assert.equal((await evaluate(db,proposal(fence,{action_id:'unapproved_tool',observed_at:Date.now()-100_000}))).code,'STALE_EVIDENCE');
  for(let i=0;i<2;i++)assert.equal((await evaluate(db,proposal(fence,{action_id:'unapproved_tool'}))).code,'UNKNOWN_ACTION');
  assert.equal(sql.prepare('SELECT count(*) n FROM relay_incidents').get().n,1);
  assert.ok(!JSON.stringify(sql.prepare('SELECT * FROM relay_actions').all()).includes(secret));
});

test('audit failure rolls back the incident, and audit rows reject update/delete/executable outcomes',async t=>{
  const {db,sql}=fixture(t),fence=await acquireRelayRun(db,source);
  sql.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON relay_actions BEGIN SELECT RAISE(ABORT,'injected audit failure'); END");
  await assert.rejects(evaluate(db,proposal(fence,{action_id:'unapproved_tool'})),/injected audit failure/);
  assert.equal(sql.prepare('SELECT count(*) n FROM relay_incidents').get().n,0);
  sql.exec('DROP TRIGGER reject_audit');
  await evaluate(db,proposal(fence));
  assert.throws(()=>sql.exec("UPDATE relay_actions SET error_code='success'"),/append only/);
  assert.throws(()=>sql.exec('DELETE FROM relay_actions'),/append only/);
  // The SQL constraint is a second independent disabled gate.
  const row=sql.prepare('SELECT * FROM relay_actions').get();row.id=crypto.randomUUID();row.action_key=crypto.randomUUID();row.outcome='executed';
  assert.throws(()=>sql.prepare('INSERT INTO relay_actions('+Object.keys(row).join(',')+') VALUES ('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row)),/CHECK constraint/);
});

test('fence is checked inside the audit transaction after preflight state changes',async t=>{
  const {db,sql}=fixture(t),fence=await acquireRelayRun(db,source),original=db.batch;
  db.batch=async statements=>{sql.exec("UPDATE relay_leases SET generation=generation+1");return original(statements)};
  assert.equal((await evaluate(db,proposal(fence))).code,'FENCE_LOST');
});

test('approval binds ordered targets, revision, digest, policy, expiry and nonce; denials never consume it',async t=>{
  const {db,sql}=fixture(t),p=proposal(await acquireRelayRun(db,source),{approval_id:crypto.randomUUID()}),nonce=crypto.randomUUID(),expiry=Date.now()+50000;
  const hash=await relayApprovalHash(p,expiry,nonce);
  // This direct SQL is a test-only stand-in for a future verified owner issuer. No issuer exists in PR 2.
  sql.prepare('INSERT INTO relay_approvals(id,nonce,action_hash,owner_actor,issued_at,expires_at) VALUES (?,?,?,?,?,?)')
    .run(p.approval_id,nonce,hash,'verified-owner-fixture',Date.now()-1000,expiry);
  assert.equal((await evaluate(db,p)).code,'RELAY_DISABLED');
  assert.equal(sql.prepare('SELECT consumed_at FROM relay_approvals').get().consumed_at,null);
  for(const patch of [{expected_revision:2},{evidence_hash:'c'.repeat(64)},
    {targets:[{kind:'task',id:crypto.randomUUID()}]},{action_id:'accept_result'}])
    assert.equal((await evaluate(db,{...p,...patch,action_key:crypto.randomUUID()})).code,patch.action_id?'OWNER_ONLY':'INVALID_APPROVAL');
  for(const change of ["consumed_at=1","consumed_at=NULL,expires_at=issued_at+1","expires_at=9999999999999,nonce='00000000-0000-4000-8000-000000000000'"]){
    sql.exec('UPDATE relay_approvals SET '+change);
    assert.equal((await evaluate(db,{...p,action_key:crypto.randomUUID()})).code,'INVALID_APPROVAL');
  }
  const p2={...p,targets:[...p.targets,{kind:'task',id:crypto.randomUUID()}]};
  assert.notEqual(await relayApprovalHash(p2,expiry,nonce),await relayApprovalHash({...p2,targets:[...p2.targets].reverse()},expiry,nonce));
});

test('future proposal inbox and runtime imports are absent',()=>{
  for(const path of ['worker/index.ts','worker/operations.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/relay-(state|executor)|scheduled\s*\(/);
  assert.ok(!Object.keys(RELAY_ACTIONS).some(a=>/proposal|publish_task/.test(a)));
  const routes=readdirSync('app/api',{recursive:true}).filter(p=>p.endsWith('.ts'));
  assert.ok(!routes.some(p=>/task-proposal|relay/.test(p)));
  for(const route of routes)assert.doesNotMatch(readFileSync('app/api/'+route,'utf8'),/relay-(state|executor)/);
});
