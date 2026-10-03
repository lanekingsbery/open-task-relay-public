import {prepareRequestAssessment,INTAKE_INFERENCE_TIMEOUT_MS,type AssessmentPort} from './relay-request-assessment.ts';
/** Scheduled-only bounded executor. No caller-controlled action dispatch. */
import {z} from 'zod';
import {firstReviewWhere} from './first-review.ts';
import {acquireRelayRun,finishRelayRun,FENCE_EXISTS,type RelayDatabase} from './relay-state.ts';
import {relayDigest} from './relay-executor.ts';
import {OPERATOR_DB_NOW,OPERATOR_ENABLED,OPERATOR_LIMITS,OPERATOR_RULES,EXPIRED_UNSUBMITTED} from './relay-operator-policy.ts';
import {guard,receipt,jsonRows,sourceSchema} from './relay-operator-store.ts';
const wakeSchema=z.object({wake_id:z.string().uuid(),source_version:sourceSchema,static_health:z.enum(['ok','unavailable','not_checked']).default('not_checked')}).strict();
const expiredSchema=z.object({id:z.string().uuid(),status:z.enum(['claimed','in_progress']),assignee:z.string().nullable(),
 claim_expires_at:z.string(),updated_at:z.string(),protocol:z.string().nullable()});
const agingSchema=z.object({id:z.string().uuid(),created_at:z.string(),protocol:z.string().nullable()});

export async function runRelayOperator(db:RelayDatabase,input:unknown,assessmentPort?:AssessmentPort){
 const wake=wakeSchema.parse(input),started=Date.now();
 let deadline=started+OPERATOR_LIMITS.durationMs;
 const active=()=>{if(Date.now()>=deadline)throw new Error('OPERATOR_TIMEOUT')};
 const previous=()=>db.prepare('SELECT id FROM relay_observations WHERE id=?').bind(wake.wake_id).first();
 if(await previous())return {code:'REPLAYED'};
 if(!await db.prepare(`SELECT id FROM relay_operator_control WHERE id=1 AND enabled=1`).first())return {code:'PAUSED'};
 active();
 const fence=await acquireRelayRun(db,wake.source_version,'scheduled_operator');
 if(!fence)return {code:'LEASE_BUSY'};
 try{
  active();
  if(await previous()){await finishRelayRun(db,fence);return {code:'REPLAYED'}}
  const stamp=new Date(started).toISOString(),day=Math.floor(started/86400000)*86400000;
  const expired=expiredSchema.nullable().parse(await db.prepare(`SELECT id,status,assignee,claim_expires_at,updated_at,protocol
   FROM tasks WHERE ${EXPIRED_UNSUBMITTED} AND claim_expires_at<=? AND NOT EXISTS(SELECT 1 FROM relay_operator_receipts r WHERE r.action_key='expire:'||tasks.id||':'||tasks.claim_expires_at) ORDER BY claim_expires_at,id LIMIT 1`).bind(stamp).first());
  const aging=agingSchema.nullable().parse(await db.prepare(`SELECT id,created_at,protocol FROM tasks WHERE status='open'
   AND moderation_status='approved' AND accepted_result_id IS NULL AND created_at<=?
   AND NOT EXISTS(SELECT 1 FROM relay_operator_followups f WHERE f.fingerprint='aging:'||tasks.id)
   ORDER BY created_at,id LIMIT 1`).bind(new Date(started-60*86400000).toISOString()).first());
  const queued=await jsonRows(db,`SELECT coalesce(json_group_array(json_object('status',status,'created_at',created_at)),'[]') rows
   FROM (SELECT status,created_at FROM relay_task_requests WHERE status IN ('HOLD','DRAFT') ORDER BY created_at LIMIT 25)`);
  const workQueues=z.object({open_tasks:z.number(),pending_first_reviews:z.number()}).parse(await db.prepare(`SELECT
   (SELECT count(*) FROM (SELECT id FROM tasks WHERE status='open' AND moderation_status='approved' AND accepted_result_id IS NULL LIMIT 25)) open_tasks,
   (SELECT count(*) FROM (SELECT r.id FROM results r JOIN tasks t ON t.id=r.task_id WHERE ${firstReviewWhere} LIMIT 25)) pending_first_reviews`).first());
  const spent=z.object({n:z.number()}).parse(await db.prepare('SELECT count(*) n FROM relay_operator_receipts WHERE autonomous=1 AND created_at>=?').bind(day).first()).n;
  let available=Math.max(0,OPERATOR_LIMITS.dailyActions-spent);
  const statements=[];
  let count=0;
  let assessed:Awaited<ReturnType<typeof prepareRequestAssessment>>=null;
  if(assessmentPort&&available>0&&wake.static_health==='ok'){
   assessed=await prepareRequestAssessment(db,assessmentPort,wake.source_version,fence.run_id,day,deadline,async()=>{
    // Idle/deterministic wakes retain 30 seconds. Only a selected assessment gets
    // one bounded inference allowance, while the same lease/final commit gates hold.
    active();const extended=deadline+INTAKE_INFERENCE_TIMEOUT_MS;
    const [check,clear]=guard(db,`${OPERATOR_ENABLED} AND ${FENCE_EXISTS} AND ${OPERATOR_DB_NOW}<?`,[fence.run_id,fence.generation,Date.now(),deadline]);
    await db.batch([check,db.prepare("UPDATE relay_leases SET expires_at=? WHERE name='maintenance' AND run_id=? AND generation=?")
     .bind(extended+30_000,fence.run_id,fence.generation),clear]);
    deadline=extended;return deadline;
   });
   if(assessed){statements.push(...assessed.statements);count++;available--}
  }
  if(expired&&count<OPERATOR_LIMITS.perWake&&available>0&&wake.static_health!=='unavailable'){
   const [check,clear]=guard(db,`EXISTS(SELECT 1 FROM tasks WHERE id=? AND ${EXPIRED_UNSUBMITTED}
    AND claim_expires_at=? AND claim_expires_at<=? AND updated_at=? AND protocol IS ? AND assignee IS ? AND status=?)`,
    [expired.id,expired.claim_expires_at,stamp,expired.updated_at,expired.protocol,expired.assignee,expired.status]);
   statements.push(check,
    db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_id,entity_type,summary)
     VALUES (?,?,?,'claim expired',?,'tasks','Unsubmitted claim expired; task reopened.') ON CONFLICT(id) DO NOTHING`)
     .bind('lease:'+expired.id+':'+expired.claim_expires_at,stamp,expired.assignee,expired.id),
    db.prepare("UPDATE tasks SET status='open',assignee=NULL,claim_expires_at=NULL,updated_at=? WHERE id=?").bind(stamp,expired.id),
    await receipt(db,{key:'expire:'+expired.id+':'+expired.claim_expires_at,run:fence.run_id,actor:'site_operator:relay',rule:OPERATOR_RULES.expire,
     reason:'Expired lease with no saved results or acceptance; canonical requeue.',source:wake.source_version,target:expired.id,autonomous:true,
     before:expired,after:{...expired,status:'open',assignee:null,claim_expires_at:null,updated_at:stamp}}),clear);
   count++;available--;
  }
  if(aging&&count<OPERATOR_LIMITS.perWake&&available>0){
   const fingerprint='aging:'+aging.id,incident=crypto.randomUUID(),followup=crypto.randomUUID();
   const [check,clear]=guard(db,`EXISTS(SELECT 1 FROM tasks WHERE id=? AND status='open' AND moderation_status='approved'
    AND accepted_result_id IS NULL AND created_at=? AND protocol IS ?)`,[aging.id,aging.created_at,aging.protocol]);
   statements.push(check,
    db.prepare("INSERT INTO relay_incidents(id,fingerprint,first_seen,last_seen,status,severity,next_check_at) VALUES (?,?,?,?,'new','info',?)")
     .bind(incident,fingerprint,started,started,started+86400000),
    db.prepare("INSERT INTO relay_operator_followups(id,fingerprint,incident_id,target_id,reason,created_at) VALUES (?,?,?,?,'Review task aged at least 60 days; age alone never authorizes retirement.',?)")
     .bind(followup,fingerprint,incident,aging.id,started),
    await receipt(db,{key:fingerprint,run:fence.run_id,actor:'site_operator:relay',rule:OPERATOR_RULES.aging,
     reason:'60-day inventory review due; moderation follow-up only.',source:wake.source_version,target:aging.id,autonomous:true,
     before:{},after:{incident_id:incident,followup_id:followup}}),clear);
   count++;available--;
  }
  const oldest=z.object({id:z.string(),created_at:z.number()}).nullable().parse(await db.prepare(`SELECT id,created_at FROM relay_task_requests r
   WHERE status IN ('HOLD','DRAFT') AND created_at<=? AND NOT EXISTS(SELECT 1 FROM relay_operator_followups f WHERE f.fingerprint='request:'||r.id)
   ORDER BY created_at LIMIT 1`).bind(started-7*86400000).first());
  if(wake.static_health==='unavailable'&&count<OPERATOR_LIMITS.perWake&&available>0&&!await db.prepare("SELECT id FROM relay_operator_followups WHERE fingerprint='health:static-assets' AND status='open'").first()){
   const incident=crypto.randomUUID(),followup=crypto.randomUUID(),fingerprint='health:static-assets:'+wake.wake_id;
   statements.push(db.prepare("INSERT INTO relay_incidents(id,fingerprint,first_seen,last_seen,status,severity,next_check_at) VALUES (?,?,?,?,'new','warning',?)").bind(incident,fingerprint,started,started,started+3600000),
    db.prepare("INSERT INTO relay_operator_followups(id,fingerprint,incident_id,target_id,reason,created_at) VALUES (?,'health:static-assets',?,'site','Static health check failed. Expiry execution is held; inspect site deployment.',?) ON CONFLICT(fingerprint) DO UPDATE SET incident_id=excluded.incident_id,status='open',created_at=excluded.created_at").bind(followup,incident,started),
    await receipt(db,{key:fingerprint,run:fence.run_id,actor:'site_operator:relay',rule:OPERATOR_RULES.health,reason:'Static health unavailable; moderation follow-up required.',source:wake.source_version,target:'site',autonomous:true,before:{},after:{incident_id:incident,followup_id:followup}}));
   count++;available--;
  }
  if(oldest&&available>0&&count<OPERATOR_LIMITS.perWake){
   const fingerprint='request:'+oldest.id,incident=crypto.randomUUID(),followup=crypto.randomUUID();
   statements.push(db.prepare("INSERT INTO relay_incidents(id,fingerprint,first_seen,last_seen,status,severity,next_check_at) VALUES (?,?,?,?,'new','warning',?)")
     .bind(incident,fingerprint,started,started,started+86400000),
    db.prepare("INSERT INTO relay_operator_followups(id,fingerprint,incident_id,target_id,reason,created_at) VALUES (?,?,?,?,'Request awaiting moderation decision for at least seven days.',?)")
     .bind(followup,fingerprint,incident,oldest.id,started),
    await receipt(db,{key:fingerprint,run:fence.run_id,actor:'site_operator:relay',rule:OPERATOR_RULES.health,reason:'Aging request queue requires moderation review.',
     source:wake.source_version,target:oldest.id,autonomous:true,before:{},after:{incident_id:incident,followup_id:followup}}));
   count++;available--;
  }
  active();
  const state={mode:'operator-v2',database:'available',queue_sample:queued,queue_sample_limit:25,work_queues_capped_at_25:workQueues,
   expired_candidate:expired?.id??null,aging_candidate:aging?.id??null,actions:count,budget_remaining:available,
   inference:assessed?.callId?'shared_kimi_budget':'unused',request_assessment:assessed?.status??null,static_assets:wake.static_health,external_health:'not_checked'};
  const [check,clear]=guard(db,`${OPERATOR_ENABLED} AND ${FENCE_EXISTS} AND ${OPERATOR_DB_NOW}<?
   AND CAST(strftime('%s','now') AS INTEGER)/86400=CAST(?/86400000 AS INTEGER)
   AND (SELECT count(*) FROM relay_operator_receipts WHERE autonomous=1 AND created_at>=?)+?<=20`,
   [fence.run_id,fence.generation,started,deadline,day,day,count]);
  const evidence=await relayDigest(JSON.stringify(state));active();
  await db.batch([check,...statements,
   db.prepare(`INSERT INTO relay_observations(id,run_id,check_id,observed_at,fingerprint,severity,state_json_redacted,source_refs,expires_at)
    VALUES (?,?,'operator.health',?,?,'info',?,'[]',?)`).bind(wake.wake_id,fence.run_id,started,evidence,JSON.stringify(state),started+3600000),
   db.prepare(`INSERT INTO relay_check_state(check_id,last_attempt_at,last_success_at,observation_id) VALUES ('operator.health',?,?,?)
    ON CONFLICT(check_id) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,last_success_at=excluded.last_success_at,observation_id=excluded.observation_id`)
    .bind(started,started,wake.wake_id),
   db.prepare("UPDATE relay_runs SET status='finished',finished_at=?,counts=? WHERE run_id=?")
    .bind(Date.now(),JSON.stringify({observations:1,actions:count,inference:assessed?.callId?1:0}),fence.run_id),
   db.prepare("UPDATE relay_leases SET expires_at=? WHERE name='maintenance' AND run_id=? AND generation=?")
    .bind(Date.now(),fence.run_id,fence.generation),clear]);
  return {code:'EXECUTED',actions:count};
 }catch{
  // Leave the fence to expire. A later wake can recover; failed commit produced no partial actions.
  await db.prepare("UPDATE relay_runs SET status='failed',finished_at=?,error_code='OPERATOR_FAILED' WHERE run_id=? AND status='running'")
   .bind(Date.now(),fence.run_id).run().catch(()=>{});
  throw new Error('OPERATOR_FAILED');
 }
}
