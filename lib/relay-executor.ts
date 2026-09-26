/** PR 2: validate and audit denials. No action adapters, model, fetch, approval issuer or enabling switch. */
import {z} from 'zod';
import {classifyRelayAction, RELAY_ACTOR, RELAY_POLICY_VERSION} from './relay-policy.ts';
import {FENCE_EXISTS, type RelayDatabase} from './relay-state.ts';

const uuid=z.string().uuid();
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const time=z.number().int().nonnegative().safe();
const target=z.object({kind:z.enum(['task','result','message','incident']),id:uuid}).strict();
export const relayProposalSchema=z.object({
  action_id:z.string().regex(/^[a-z_]{1,64}$/), policy_version:z.literal(RELAY_POLICY_VERSION),
  targets:z.array(target).max(20), expected_revision:z.number().int().positive(),
  evidence_refs:z.array(z.object({kind:z.enum(['observation','revision','source_digest']),id:uuid}).strict()).max(20),
  evidence_hash:digest, observed_at:time, expires_at:time,
  run_id:uuid, lease_generation:z.number().int().positive(), action_key:uuid,
  approval_id:uuid.optional(),
}).strict();
export type RelayProposal=z.infer<typeof relayProposalSchema>;
export async function relayDigest(text:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),
    b=>b.toString(16).padStart(2,'0')).join('');
}

/** Digest format for a FUTURE verified-owner issuer. Hashing does not authenticate the issuer. */
export async function relayApprovalHash(proposal:RelayProposal, expiresAt:number, nonce:string) {
  const p=relayProposalSchema.parse(proposal);
  time.parse(expiresAt);uuid.parse(nonce);
  return relayDigest(JSON.stringify({action_id:p.action_id,targets:p.targets,expected_revision:p.expected_revision,
    evidence_hash:p.evidence_hash,policy_version:p.policy_version,expires_at:expiresAt,nonce}));
}
const approvalSchema=z.object({action_hash:digest, owner_actor:z.string().min(1).max(256),
  issued_at:time, expires_at:time, consumed_at:time.nullable(),nonce:uuid});
const resultSchema=z.object({proposal_hash:digest,error_code:z.string()});

/** Caller must eventually be server-authenticated. This unconnected module never trusts a proposal's identity. */
export async function evaluateRelayProposal(db:RelayDatabase, rawJson:string) {
  const now=Date.now();
  let p:RelayProposal|undefined;
  let code='INVALID_PROPOSAL';
  // Bound parsing, hashing and persisted data. No raw proposal/model text is ever stored.
  const bounded=typeof rawJson==='string'&&rawJson.length<=16_384&&new TextEncoder().encode(rawJson).length<=16_384;
  if(bounded) {
    try {p=relayProposalSchema.parse(JSON.parse(rawJson));}catch { /* bounded denial below */ }
  }
  const proposalHash=await relayDigest(p?JSON.stringify(p):bounded?rawJson:'OVERSIZED_OR_NONSTRING');
  let actionKey=p?.action_key??`invalid:${proposalHash}`;
  let prior=await db.prepare('SELECT proposal_hash,error_code FROM relay_actions WHERE action_key=?').bind(actionKey).first();
  if(prior) {
    const row=resultSchema.parse(prior);
    if(row.proposal_hash===proposalHash)return {executable:false as const,code:row.error_code,replayed:true};
    // A changed payload cannot borrow a previous key. Preserve a separate immutable conflict denial.
    code='IDEMPOTENCY_CONFLICT';actionKey+=`:conflict:${proposalHash}`;
  } else if(p) {
    const classification=classifyRelayAction(p.action_id);
    code=classification.code;
    if((code==='RELAY_DISABLED'||code==='UNKNOWN_ACTION')&&(p.observed_at>now||now-p.observed_at>Math.min(classification.policy?.maxEvidenceAgeSeconds??60,60)*1000||
      p.expires_at<=now||p.expires_at<=p.observed_at||p.expires_at-p.observed_at>60_000))code='STALE_EVIDENCE';
    else if(code==='RELAY_DISABLED'&&p.approval_id) {
      const a=approvalSchema.safeParse(await db.prepare('SELECT * FROM relay_approvals WHERE id=?').bind(p.approval_id).first());
      if(!a.success||a.data.issued_at>now||a.data.expires_at<=now||a.data.consumed_at!==null||
        a.data.action_hash!==await relayApprovalHash(p,a.data.expires_at,a.data.nonce))code='INVALID_APPROVAL';
      // Valid stored approval still cannot override the denial-only policy and is never consumed.
    }
  }
  const known=p&&classifyRelayAction(p.action_id).policy;
  // Incident creation follows the action classification even when stale evidence changes the denial code.
  const unknown=p!==undefined&&classifyRelayAction(p.action_id).code==='UNKNOWN_ACTION';
  const fingerprint=unknown?await relayDigest(`policy.unknown_action:${p!.action_id}`):null;
  const incidentId=crypto.randomUUID();
  const preconditionHash=p?await relayDigest(JSON.stringify({targets:p.targets,expected_revision:p.expected_revision})):null;
  const statements=[];
  if(fingerprint)statements.push(db.prepare(`INSERT INTO relay_incidents(id,fingerprint,first_seen,last_seen,status,severity)
    VALUES (?,?,?,?,'new','warning') ON CONFLICT(fingerprint) DO UPDATE SET last_seen=excluded.last_seen,
    status=CASE WHEN relay_incidents.status='resolved' THEN 'active' ELSE relay_incidents.status END`)
    .bind(incidentId,fingerprint,now,now));
  // Concurrent identical keys collapse; all stored details are typed references or hashes.
  // Fence evaluated at INSERT time. No stale runner can acquire an executable outcome.
  statements.push(db.prepare(`INSERT INTO relay_actions(id,action_key,run_id,incident_id,actor,policy_id,policy_version,
    target,proposal_hash,precondition_hash,evidence_refs,rationale_summary,started_at,finished_at,
    expected_revision,lease_generation,observed_at,expires_at,evidence_hash,approval_id,outcome,error_code)
    SELECT ?,?,(SELECT run_id FROM relay_runs WHERE run_id=?),
      (SELECT id FROM relay_incidents WHERE fingerprint=?),?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?,?,(SELECT id FROM relay_approvals WHERE id=?),'denied',
      CASE WHEN ?=1 AND NOT ${FENCE_EXISTS} THEN 'FENCE_LOST' ELSE ? END
    ON CONFLICT(action_key) DO NOTHING`).bind(crypto.randomUUID(),actionKey,p?.run_id??null,fingerprint,
      RELAY_ACTOR,known?p!.action_id:'unrecognized',RELAY_POLICY_VERSION,JSON.stringify(p?.targets??[]),proposalHash,
      preconditionHash,JSON.stringify(p?.evidence_refs??[]),'PR2_DENIAL_ONLY',now,now,
      p?.expected_revision??null,p?.lease_generation??null,p?.observed_at??null,p?.expires_at??null,p?.evidence_hash??null,p?.approval_id??null,
      p&&code!=='IDEMPOTENCY_CONFLICT'?1:0,p?.run_id??null,p?.lease_generation??0,Date.now(),code));
  await db.batch(statements);
  prior=await db.prepare('SELECT proposal_hash,error_code FROM relay_actions WHERE action_key=?').bind(actionKey).first();
  const stored=resultSchema.parse(prior);
  // Concurrent different proposals racing on a new key must also get a conflict receipt.
  if(stored.proposal_hash!==proposalHash)return evaluateRelayProposal(db,rawJson);
  return {executable:false as const,code:stored.error_code,replayed:false};
}
