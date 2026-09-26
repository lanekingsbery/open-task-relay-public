/** Private state primitives only. Deliberately not imported by the Worker or public routes. */
import {z} from 'zod';
import {RELAY_POLICY_VERSION} from './relay-policy.ts';

// The subset of D1 used here, with unknown reads validated at the boundary.
export interface RelayStatement {
  bind(...values: (string | number | null)[]): RelayStatement;
  first(): Promise<unknown>;
  run(): Promise<unknown>;
}
export interface RelayDatabase {
  prepare(sql: string): RelayStatement;
  batch(statements: RelayStatement[]): Promise<unknown[]>;
}
export const relayFenceSchema=z.object({run_id:z.string().uuid(), generation:z.number().int().positive()}).strict();
export type RelayFence=z.infer<typeof relayFenceSchema>;
const leaseMilliseconds=60_000;
export const FENCE_EXISTS=`EXISTS(SELECT 1 FROM relay_leases l JOIN relay_runs r ON r.run_id=l.run_id
  WHERE l.name='maintenance' AND l.run_id=? AND l.generation=? AND l.expires_at>?
  AND l.expires_at > (CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))
  AND r.status='running' AND r.lease_generation=l.generation)`;

/** A fresh server-generated ID per attempt; an expired runner never regains the same fence. */
export async function acquireRelayRun(db:RelayDatabase, sourceVersion:string):Promise<RelayFence|null> {
  if(!/^[a-f0-9]{40}$/.test(sourceVersion))throw new Error('INVALID_SOURCE_VERSION');
  const now=Date.now(), runId=crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO relay_leases(name,run_id,generation,expires_at) VALUES ('maintenance',?,1,?)
      ON CONFLICT(name) DO UPDATE SET run_id=excluded.run_id,generation=relay_leases.generation+1,
      expires_at=excluded.expires_at WHERE relay_leases.expires_at<=?`).bind(runId,now+leaseMilliseconds,now),
    db.prepare(`INSERT INTO relay_runs(run_id,trigger,started_at,status,policy_version,source_version,lease_generation)
      SELECT run_id,'manual_rehearsal',?,'running',?,?,generation FROM relay_leases
      WHERE name='maintenance' AND run_id=?`).bind(now,RELAY_POLICY_VERSION,sourceVersion,runId),
  ]);
  const row=await db.prepare('SELECT run_id,lease_generation AS generation FROM relay_runs WHERE run_id=?').bind(runId).first();
  return row?relayFenceSchema.parse(row):null;
}

/** Fence and audit/run completion are checked in the same D1 batch, never via a read-then-write. */
export async function finishRelayRun(db:RelayDatabase, fence:RelayFence) {
  relayFenceSchema.parse(fence);
  const now=Date.now(), guard=crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN ${FENCE_EXISTS} THEN 1 ELSE 0 END`)
      .bind(guard,fence.run_id,fence.generation,now),
    db.prepare("UPDATE relay_runs SET status='finished',finished_at=? WHERE run_id=?").bind(now,fence.run_id),
    db.prepare("UPDATE relay_leases SET expires_at=? WHERE name='maintenance' AND run_id=? AND generation=?")
      .bind(now,fence.run_id,fence.generation),
    db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(guard),
  ]);
}
