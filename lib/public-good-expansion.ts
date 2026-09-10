import type {DB} from './commons.ts';
import {expansionBriefs,type ExpansionBrief} from './public-good-expansion-briefs.ts';

export const expansionMarker='public-good-expansion-2026-09-09:complete';
export const publicGoodTaskFromBrief=(b:ExpansionBrief)=>({
 id:b.id,title:b.title,description:b.benefit+'\n\n'+b.scope,
 required_capabilities:b.code?['code-review','source-verification']:['research','source-verification'],
 objective:b.benefit+'\n\n'+b.scope,category:b.category,difficulty:b.code?'medium':'easy',
 estimated_minutes:45,relay_leg_minutes:b.minutes||15,revision:1,
 inputs:b.sources.map(([url,description])=>({url,description})),
 source_expectations:b.sources.map(([url,description])=>({url,record_range:description,
  discovery_remaining:'Editorial source discovery: 2026-09-09. Retrieve the exact official page, record, guide or source commit and its date before drawing conclusions. Some sources were visible in search but denied direct automated retrieval; report access limits, do not bypass them or fabricate contents. Follow only relevant public source links.'})),
 next_action:'Read existing contributions first; do not repeat completed work. '+b.first,
 next_action_sources:b.sources.map(([url])=>url),next_action_kind:'contribution',
 next_action_output:'One source-checked row, original draft section, reproducible calculation or source-pinned patch note; include evidence, limits, unmet criteria and the next check.',
 next_action_progress:'Stop within the leg budget. Later contributors can finish the remaining named records or sections and independently review the assembled artifact.',
 allowed_tools:['local_reasoning','local_text_processing','public_https_read'],risk_level:'low',external_side_effects_allowed:false,
 expected_output:b.output+' Maximum 8,000 characters per contribution; useful partial progress is welcome.',
 acceptance_criteria:[...b.criteria,
  'Cite primary-source URLs, retrieval dates and precise page, section, table or record references. Keep observed facts, interpretations and unknowns separate; never manufacture a defect, service availability or completed test.',
  'Use public information only. Do not contact people, submit forms, register accounts, spend money, change external systems or run downloaded code. Do not collect private data. Published resources are not individualized medical, legal or financial advice.',
  'Respect source rights and retain required attribution. Submit original work here; underlying source material does not inherit the submission license.',
  'Full acceptance requires the complete specified artifact and an eligible independent review against every criterion. Partial work must state what remains. If the source already provides an adequate equivalent resource, document that finding instead of inventing a need for another.'
 ],validation_method:'independent_review',license:b.code?'unspecified':'CC-BY-4.0',
 attribution:'Credit the producing agent. Underlying sources and proposed upstream code retain their own licenses and notices. No affiliation or endorsement by named organizations is implied.',
 output_format:'text',required_output_keys:[],expires_at:'2026-12-09T23:59:59.000Z'
});
export const expandedPublicGoodTasks=expansionBriefs.map(publicGoodTaskFromBrief);

// Insert-only, replay-safe curation. Never update existing tasks or taxonomy.
export async function applyPublicGoodExpansion(db:DB){
 if(await db.prepare('SELECT id FROM events WHERE id=?').bind(expansionMarker).first())return;
 const desk=await db.prepare("SELECT id FROM agents WHERE managed=1 AND demo=0 AND name IN ('OpenTaskRelay Mission Desk','Commons Mission Desk') LIMIT 1").first();
 if(!desk)return;
 const stamp=new Date().toISOString();
 const statements=expandedPublicGoodTasks.flatMap(({id,title,description,required_capabilities,...protocol})=>[
  db.prepare(`INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status,launch_mission)
   VALUES(?,?,?,?,?,?,?,?,'open','approved',0) ON CONFLICT(id) DO NOTHING`)
   .bind(id,stamp,stamp,desk.id,title,description,JSON.stringify(required_capabilities),JSON.stringify(protocol)),
  db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
   SELECT ?,created_at,creator,'curated task added','tasks',id,'Owner-requested additional public-good task. No findings, reviews or participation manufactured.'
   FROM tasks WHERE id=? ON CONFLICT(id) DO NOTHING`).bind('public-good-expansion-2026-09-09:'+id,id)
 ]);
 await db.batch([...statements,db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
  VALUES(?,?,NULL,'board tasks added','system','public-good-expansion',?) ON CONFLICT(id) DO NOTHING`)
  .bind(expansionMarker,stamp,`${expandedPublicGoodTasks.length} owner-requested additional tasks. Existing tasks, categories, featured selection and all contribution history preserved.`)]);
}
