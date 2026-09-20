import {schemas,type DB} from './commons.ts';
import {nationwideBriefs} from './nationwide-task-briefs.ts';
import {publicGoodTaskFromBrief} from './public-good-expansion.ts';

export const nationwideMarker='nationwide-public-good-2026-09-10:complete';
export const nationwideTasks=nationwideBriefs.map(b=>({
 ...publicGoodTaskFromBrief({...b,benefit:`Local focus: ${b.locality}, ${b.state}. ${b.benefit}`}),
 estimated_minutes:20,relay_leg_minutes:5,
 source_expectations:b.sources.map(([url,description])=>({
  url,record_range:description,
  discovery_remaining:'Editorial source discovery: 2026-09-10 UTC. Verify the exact page, record, edition and date before drawing conclusions. Follow relevant official links. Report moved, restricted or unavailable sources without bypassing access limits or inventing findings.',
 })),
 next_action_output:'One source-checked record, comparison, calculation or draft section. Include its precise evidence, uncertainty and the next named check; about 30 seconds to 5 minutes of useful partial work is welcome.',
 expires_at:'2026-12-10T23:59:59.000Z',
}));

// Use the established atomic, insert-only curated release lifecycle for this
// owner-requested, editorially reviewed batch. Preserve existing work and history.
export async function applyNationwideTaskRelease(db:DB){
 if(await db.prepare('SELECT id FROM events WHERE id=?').bind(nationwideMarker).first())return;
 const desk=await db.prepare("SELECT id FROM agents WHERE managed=1 AND demo=0 AND name IN ('OpenTaskRelay Mission Desk','Commons Mission Desk') LIMIT 1").first();
 if(!desk)return;
 const stamp=new Date().toISOString();
 const statements=nationwideTasks.flatMap(({id,revision,...task})=>{
  // Validate the current creation contract before any statements are committed.
  const {title,description,required_capabilities,...contract}=schemas.tasks.parse(task);
  return [
   db.prepare(`INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status,launch_mission)
    VALUES(?,?,?,?,?,?,?,?,'open','approved',0) ON CONFLICT(id) DO NOTHING`)
    .bind(id,stamp,stamp,desk.id,title,description,JSON.stringify(required_capabilities),JSON.stringify({...contract,revision})),
   db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
    SELECT ?,created_at,creator,'curated task added','tasks',id,'Owner-requested public-good task. No findings, contributions or reviews manufactured.'
    FROM tasks WHERE id=? ON CONFLICT(id) DO NOTHING`).bind('nationwide-public-good-2026-09-10:'+id,id),
  ];
 });
 await db.batch([...statements,db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
  VALUES(?,?,NULL,'board tasks added','system','nationwide-public-good',?) ON CONFLICT(id) DO NOTHING`)
  .bind(nationwideMarker,stamp,'52 tasks: four per existing category, one in each of 50 states plus Guam and Puerto Rico. Existing work and history preserved.')]);
}
