/** Dormant, private shadow runner. No runtime entrypoint, inference, transport or action adapter. */
import {z} from 'zod';
import {RELAY_ACTOR, RELAY_POLICY_VERSION, RELAY_LIMITS, classifyRelayAction} from './relay-policy.ts';
import {relayDigest, relayProposalSchema} from './relay-executor.ts';
import {acquireRelayRun, FENCE_EXISTS, type RelayDatabase, type RelayFence} from './relay-state.ts';

export const RELAY_SHADOW_LIMITS=Object.freeze({candidateWindow:25, proposals:1, durationMs:30_000});
const checkId='inventory.aging';
const wakeSchema=z.object({wake_id:z.string().uuid(),source_version:z.string().regex(/^[a-f0-9]{40}$/)}).strict();
const candidateSchema=z.object({id:z.string().uuid(),revision:z.number().int().positive().safe(),
  created_at:z.string().datetime()}).strict();
type Candidate=z.infer<typeof candidateSchema>;
const receiptSchema=z.object({source_version:z.string(),status:z.literal('finished'),run_id:z.string().uuid()});
const dbNow="(CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))";

/** Fixed metadata projection. No title, body, protocol text, identity, contact or credential is read. */
async function inspectCandidate(db:RelayDatabase, now:number):Promise<Candidate|null> {
  // Materialize a bounded window before joins/JSON extraction. This is a sample, not an inventory census.
  const row=await db.prepare(`WITH window AS MATERIALIZED (
      SELECT id,creator,created_at,protocol FROM tasks
      WHERE status='open' AND moderation_status='approved' AND accepted_result_id IS NULL
      ORDER BY rowid LIMIT ${RELAY_SHADOW_LIMITS.candidateWindow}
    ) SELECT t.id,t.created_at,json_extract(t.protocol,'$.revision') AS revision
    FROM window t JOIN agents a ON a.id=t.creator
    WHERE a.managed=1 AND a.demo=0 AND length(t.protocol)<=65536 AND json_valid(t.protocol)
      AND json_type(t.protocol,'$.revision')='integer'
      AND json_extract(t.protocol,'$.revision')>0 AND t.created_at<=?
    ORDER BY t.created_at,t.id LIMIT 1`).bind(new Date(now-RELAY_LIMITS.reviewAfterDays*86_400_000).toISOString()).first();
  return row===null?null:candidateSchema.parse(row);
}

/** Additional private evaluation gate; an observation is never permission to execute its action. */
export function validateRelayShadowProposal(raw:unknown, candidate:Candidate, fence:RelayFence, evidenceHash:string, observationId:string, now:number) {
  const parsed=relayProposalSchema.safeParse(raw);
  if(!parsed.success)return 'INVALID_PROPOSAL';
  const p=parsed.data;
  const classification=classifyRelayAction(p.action_id);
  if(p.action_id!=='review_task_inventory')return classification.code==='RELAY_DISABLED'?'SHADOW_ACTION_DENIED':classification.code;
  if(p.approval_id!==undefined||p.run_id!==fence.run_id||p.lease_generation!==fence.generation||
    p.targets.length!==1||p.targets[0].kind!=='task'||p.targets[0].id!==candidate.id||
    p.expected_revision!==candidate.revision||p.evidence_hash!==evidenceHash||
    p.evidence_refs.length!==1||p.evidence_refs[0].kind!=='observation'||p.evidence_refs[0].id!==observationId||p.action_key!==observationId)return 'INVALID_PROPOSAL';
  if(p.observed_at>now||p.expires_at<=now||p.expires_at<=p.observed_at||
    now-p.observed_at>RELAY_SHADOW_LIMITS.durationMs||p.expires_at-p.observed_at>RELAY_SHADOW_LIMITS.durationMs)return 'STALE_EVIDENCE';
  return 'RELAY_DISABLED';
}

async function priorReceipt(db:RelayDatabase,wakeId:string,sourceVersion:string) {
  const row=await db.prepare(`SELECT r.source_version,r.status,r.run_id FROM relay_observations o
    JOIN relay_runs r ON r.run_id=o.run_id WHERE o.id=? AND o.check_id=?`).bind(wakeId,checkId).first();
  if(!row)return null;
  const receipt=receiptSchema.parse(row);
  return {code:receipt.source_version===sourceVersion?'REPLAYED':'IDEMPOTENCY_CONFLICT',run_id:receipt.run_id,executable:false as const};
}

/** One trusted manual wake, one lease, one bounded sample, at most one private denied proposal.
 * The host must supply its own DB binding and source SHA. There is deliberately no production caller.
 * Retrying a wake uses the same UUID/source SHA; failed attempts can be retried under a fresh fence.
 */
export async function runRelayShadow(db:RelayDatabase,input:unknown) {
  const wake=wakeSchema.safeParse(input);
  if(!wake.success)return {code:'INVALID_WAKE',executable:false as const};
  const {wake_id:wakeId,source_version:sourceVersion}=wake.data;
  const started=Date.now(), deadline=started+RELAY_SHADOW_LIMITS.durationMs;
  let fence:RelayFence|null=null;
  let expired=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  // D1 promises cannot be cancelled. Every post-await stage checks this latch; SQL also checks
  // database time. An already committed batch with a delayed response is recovered by replay.
  const active=()=>{if(expired||Date.now()>=deadline)throw new Error('SHADOW_TIMEOUT')};
  const work=async()=>{
    try {
      const prior=await priorReceipt(db,wakeId,sourceVersion);active();
      if(prior)return prior;
      fence=await acquireRelayRun(db,sourceVersion);active();
      if(!fence)return {code:'LEASE_BUSY',executable:false as const};
      // Another invocation may have completed between the first replay read and acquisition.
      const replay=await priorReceipt(db,wakeId,sourceVersion);active();
      if(replay) {
        await closeFailedRun(db,fence,'REPLAY_AFTER_ACQUIRE');
        return replay;
      }
      const observedAt=Date.now();
      const candidate=await inspectCandidate(db,observedAt);active();
      const state=JSON.stringify({mode:'shadow',evaluator:'deterministic-v1',
        candidate,assessment:candidate?'REVIEW_DUE':'NO_CANDIDATE',
        source_checks:'NOT_PERFORMED',editorial_eligibility:'NOT_ESTABLISHED'});
      const evidenceHash=await relayDigest(state);active();
      const proposal=candidate?relayProposalSchema.parse({action_id:'review_task_inventory',policy_version:RELAY_POLICY_VERSION,
        targets:[{kind:'task',id:candidate.id}],expected_revision:candidate.revision,
        evidence_refs:[{kind:'observation',id:wakeId}],evidence_hash:evidenceHash,
        observed_at:observedAt,expires_at:deadline,run_id:fence.run_id,lease_generation:fence.generation,action_key:wakeId}):null;
      if(proposal&&validateRelayShadowProposal(proposal,candidate!,fence,evidenceHash,wakeId,Date.now())!=='RELAY_DISABLED')
        throw new Error('INVALID_SHADOW_EVALUATION');
      const proposalHash=proposal?await relayDigest(JSON.stringify(proposal)):null;active();
      const now=Date.now(),guard=crypto.randomUUID();
      const statements=[
        db.prepare(`INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN ${FENCE_EXISTS}
          AND ${dbNow}<? THEN 1 ELSE 0 END`).bind(guard,fence.run_id,fence.generation,now,deadline),
        db.prepare(`INSERT INTO relay_observations(id,run_id,check_id,observed_at,fingerprint,severity,state_json_redacted,source_refs,expires_at)
          VALUES (?,?,?,?,?,'info',?,?,?)`).bind(wakeId,fence.run_id,checkId,observedAt,evidenceHash,state,
            JSON.stringify(proposal?.targets??[]),deadline),
      ];
      if(proposal)statements.push(db.prepare(`INSERT INTO relay_actions(id,action_key,run_id,actor,policy_id,policy_version,
        target,expected_revision,lease_generation,observed_at,expires_at,evidence_hash,proposal_hash,evidence_refs,
        rationale_summary,started_at,finished_at,outcome,error_code)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,?,'denied','RELAY_DISABLED')`).bind(crypto.randomUUID(),`shadow:${wakeId}`,
          fence.run_id,RELAY_ACTOR,proposal.action_id,RELAY_POLICY_VERSION,JSON.stringify(proposal.targets),
          proposal.expected_revision,fence.generation,observedAt,deadline,evidenceHash,proposalHash,
          JSON.stringify(proposal.evidence_refs),'SHADOW_REVIEW_DUE_NO_AUTHORITY',now,now));
      statements.push(
        db.prepare(`INSERT INTO relay_check_state(check_id,last_attempt_at,last_success_at,observation_id) VALUES (?,?,?,?)
          ON CONFLICT(check_id) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,
          last_success_at=excluded.last_success_at,observation_id=excluded.observation_id`).bind(checkId,now,now,wakeId),
        db.prepare("UPDATE relay_runs SET status='finished',finished_at=?,counts=? WHERE run_id=?")
          .bind(now,JSON.stringify({observations:1,proposals:proposal?1:0,actions:0}),fence.run_id),
        db.prepare("UPDATE relay_leases SET expires_at=? WHERE name='maintenance' AND run_id=? AND generation=?")
          .bind(now,fence.run_id,fence.generation),
        db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guard),
      );
      active();await db.batch(statements);
      return {code:proposal?'PROPOSED':'NO_CANDIDATE',run_id:fence.run_id,executable:false as const};
    } catch {
      // Never persist/return provider, SQL, validation or submission error text.
      if(fence)await closeFailedRun(db,fence,expired||Date.now()>=deadline?'SHADOW_TIMEOUT':'SHADOW_FAILED').catch(()=>{});
      return {code:expired||Date.now()>=deadline?'SHADOW_TIMEOUT':'SHADOW_FAILED',executable:false as const};
    }
  };
  try {
    return await Promise.race([work(),new Promise<{code:string;executable:false}>(resolve=>{
      timer=setTimeout(()=>{expired=true;resolve({code:'SHADOW_TIMEOUT',executable:false})},RELAY_SHADOW_LIMITS.durationMs);
    })]);
  } finally {if(timer)clearTimeout(timer)}
}

/** Conditional cleanup cannot release a newer lease. No retry loop; abandoned attempts expire. */
async function closeFailedRun(db:RelayDatabase,fence:RelayFence,code:string) {
  const now=Date.now();
  await db.batch([
    db.prepare(`UPDATE relay_runs SET status='failed',finished_at=?,error_code=? WHERE run_id=? AND ${FENCE_EXISTS}`)
      .bind(now,code,fence.run_id,fence.run_id,fence.generation,now),
    db.prepare(`UPDATE relay_leases SET expires_at=? WHERE name='maintenance' AND run_id=? AND generation=?
      AND EXISTS(SELECT 1 FROM relay_runs WHERE run_id=? AND status='failed')`).bind(now,fence.run_id,fence.generation,fence.run_id),
  ]);
}
