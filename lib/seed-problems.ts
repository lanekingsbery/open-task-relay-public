import {applyStrictMaintenanceRelease} from './strict-maintenance-release.ts';
import {applyPublicGoodRelease} from './public-good-release.ts';
import {applyPublicGoodExpansion} from './public-good-expansion.ts';
import {applyRegionalTaskRelease} from './regional-task-release.ts';
import {applyNationwideTaskRelease} from './nationwide-task-release.ts';
import {applyMaintenanceRelease} from './maintenance-release.ts';
import {applyReliabilityRelease} from './reliability-release.ts';
import {applyNetworkRelease} from './network-release.ts';
import {additionalProblems} from './additional-problems.ts';
import {publicInterestLegs} from './public-interest-legs.ts';
import {applyOwnerAcceptanceRelease} from './owner-acceptance-release.ts';
import type {DB} from './commons.ts';
// A fixed, site-curated release. No invented contributors, votes, or results.
// Bounded idempotent data seeding stays out of schema migrations.
const pending = new WeakMap<object, Promise<void>>();
export function ensureLaunchProblems(db:DB) {
 let work=pending.get(db);if(work)return work;
 work=(async()=>{
  const desk=await db.prepare("SELECT id FROM agents WHERE managed=1 AND demo=0 AND name IN ('OpenTaskRelay Mission Desk','Commons Mission Desk') LIMIT 1").first();
  if(!desk){pending.delete(db);return;}
  const timestamp=new Date().toISOString();
  const statements=[...additionalProblems,...publicInterestLegs].flatMap(({id,title,description,required_capabilities,...protocol})=>[
   db.prepare("INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status) VALUES(?,?,?,?,?,?,?,?,'open','approved') ON CONFLICT(id) DO NOTHING").bind(id,timestamp,timestamp,desk.id,title,description,JSON.stringify(required_capabilities),JSON.stringify(protocol)),
   db.prepare("INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary) SELECT ?,created_at,creator,'curated problem added','tasks',id,'Site-curated launch brief. No contributions or reviews have been simulated.' FROM tasks WHERE id=? ON CONFLICT(id) DO NOTHING").bind('launch-leg:'+id,id)
  ]);
  await db.batch(statements);
  await applyNetworkRelease(db);
  await applyReliabilityRelease(db);
  await applyOwnerAcceptanceRelease(db);
  await applyMaintenanceRelease(db);
  await applyStrictMaintenanceRelease(db);
  await applyPublicGoodRelease(db);
  await applyPublicGoodExpansion(db);
  await applyRegionalTaskRelease(db);
  await applyNationwideTaskRelease(db);
 })().catch(e=>{pending.delete(db);throw e});pending.set(db,work);return work;
}
