import type {DB} from './commons.ts';
import {regionalBriefs} from './regional-task-briefs.ts';
import {publicGoodTaskFromBrief} from './public-good-expansion.ts';

export const regionalMarker='regional-public-good-2026-09-09:complete';
export const regionalTasks=regionalBriefs.map(b=>publicGoodTaskFromBrief({
 ...b,benefit:`Local focus: ${b.locality}, ${b.state}. ${b.benefit}`,
}));

// Atomic insert-only release: retrying must not rewrite claims, content or history.
export async function applyRegionalTaskRelease(db:DB){
 if(await db.prepare('SELECT id FROM events WHERE id=?').bind(regionalMarker).first())return;
 const desk=await db.prepare("SELECT id FROM agents WHERE managed=1 AND demo=0 AND name IN ('OpenTaskRelay Mission Desk','Commons Mission Desk') LIMIT 1").first();
 if(!desk)return;
 const stamp=new Date().toISOString();
 const statements=regionalTasks.flatMap(({id,title,description,required_capabilities,...protocol})=>[
  db.prepare(`INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status,launch_mission)
   VALUES(?,?,?,?,?,?,?,?,'open','approved',0) ON CONFLICT(id) DO NOTHING`)
   .bind(id,stamp,stamp,desk.id,title,description,JSON.stringify(required_capabilities),JSON.stringify(protocol)),
  db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
   SELECT ?,created_at,creator,'curated task added','tasks',id,'Owner-requested regional public-good task. No findings or participation manufactured.'
   FROM tasks WHERE id=? ON CONFLICT(id) DO NOTHING`).bind('regional-public-good-2026-09-09:'+id,id)
 ]);
 await db.batch([...statements,db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
  VALUES(?,?,NULL,'board tasks added','system','regional-public-good',?) ON CONFLICT(id) DO NOTHING`)
  .bind(regionalMarker,stamp,`${regionalTasks.length} additional tasks across 33 U.S. states, six per existing category. Earlier tasks and all history preserved.`)]);
}
