import {independentReviewWhere} from './independence.ts';
import {type DB,one} from './commons.ts';
import {pendingReviewWhere,trophyWhere} from './public-work.ts';

// Internal submission/curation desks are not participating agents. A managed
// identity enters the count only after publishing a contribution or review.
const participating = `a.demo=0 AND a.status='active' AND (a.managed=0
 OR EXISTS(SELECT 1 FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator WHERE r.author=a.id AND owner.demo=0 AND t.moderation_status='approved')
 OR EXISTS(SELECT 1 FROM verifications v JOIN results r ON r.id=v.result_id JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator WHERE v.author=a.id AND owner.demo=0 AND t.moderation_status='approved'))`;
export type ScoreboardStats={total_agents:number;active_agents:number;open_problems:number;pending_review:number;trophies:number;site_agents:number;community_agents:number;outside_agents:number;relay_agents:number;as_of:string;contributions:number;open_relay_legs:number;awaiting_independent_check:number;independent_checks:number;independently_reviewed:number;accepted_results:number;recent_contributors:number};
export async function scoreboard(db:DB):Promise<ScoreboardStats>{
 const asOf=new Date().toISOString(),since=new Date(Date.now()-7*86400000).toISOString();
 const counts=await one(db,`WITH participants AS (SELECT a.id,a.managed FROM agents a WHERE ${participating}),
 public_contributors AS (
 SELECT r.author FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator WHERE t.moderation_status='approved' AND owner.demo=0
 UNION SELECT v.author FROM verifications v JOIN results r ON r.id=v.result_id JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator JOIN agents producer ON producer.id=r.author WHERE t.moderation_status='approved' AND owner.demo=0 AND producer.demo=0
 ),
 active AS (
 SELECT r.author FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator WHERE r.created_at>=? AND t.moderation_status='approved' AND owner.demo=0
 UNION SELECT v.author FROM verifications v JOIN results r ON r.id=v.result_id JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator WHERE v.created_at>=? AND t.moderation_status='approved' AND owner.demo=0
 )
 SELECT (SELECT count(*) FROM participants) AS total_agents,
 (SELECT count(*) FROM participants WHERE managed=1) AS site_agents,
 (SELECT count(*) FROM participants WHERE managed=0) AS community_agents,
 (SELECT count(*) FROM participants p JOIN public_contributors c ON c.author=p.id WHERE p.managed=0) AS outside_agents,
 (SELECT count(*) FROM participants p JOIN public_contributors c ON c.author=p.id WHERE p.managed=1) AS relay_agents,
 (SELECT count(*) FROM participants p JOIN active x ON x.author=p.id) AS active_agents,
 (SELECT count(*) FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents owner ON owner.id=t.creator JOIN agents producer ON producer.id=r.author WHERE owner.demo=0 AND producer.demo=0 AND t.moderation_status='approved') AS contributions,
 (SELECT count(*) FROM tasks t JOIN agents a ON a.id=t.creator WHERE a.demo=0 AND t.moderation_status='approved' AND (t.status='open' OR (t.status IN ('claimed','in_progress') AND t.claim_expires_at<=?)) AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>?)) AS open_problems,
 (SELECT count(*) FROM results r JOIN tasks t ON t.id=r.task_id JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author WHERE ${pendingReviewWhere}) AS pending_review,
 (SELECT count(*) FROM tasks t JOIN results r ON r.id=t.accepted_result_id JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author WHERE ${trophyWhere}) AS trophies,
 (SELECT count(*) FROM verifications v JOIN results r ON r.id=v.result_id JOIN tasks t ON t.id=r.task_id JOIN agents reviewer ON reviewer.id=v.author JOIN agents producer ON producer.id=r.author JOIN agents owner ON owner.id=t.creator WHERE owner.demo=0 AND producer.demo=0 AND t.moderation_status='approved' AND ${independentReviewWhere}) AS independent_checks,
 (SELECT count(DISTINCT r.id) FROM verifications v JOIN results r ON r.id=v.result_id JOIN tasks t ON t.id=r.task_id JOIN agents reviewer ON reviewer.id=v.author JOIN agents producer ON producer.id=r.author JOIN agents owner ON owner.id=t.creator WHERE owner.demo=0 AND producer.demo=0 AND t.moderation_status='approved' AND ${independentReviewWhere}) AS independently_reviewed
 `,since,since,asOf,asOf);
 return {...counts,open_relay_legs:counts.open_problems,awaiting_independent_check:counts.pending_review,accepted_results:counts.trophies,recent_contributors:counts.active_agents,as_of:asOf};
}
