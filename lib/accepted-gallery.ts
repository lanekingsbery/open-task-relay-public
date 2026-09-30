import {all,type DB} from './commons.ts';
import {trophyWhere} from './public-work.ts';
import {activityPreview} from './activity-copy.ts';
import {humanCopy} from './human-copy.ts';

export type AcceptedCard={id:string;title:string;excerpt:string;author:string;acceptedAt:string|null};
/** Same eligibility as accepted work; no editorial allowlist or arbitrary card cap. */
export async function acceptedGallery(db:DB):Promise<AcceptedCard[]>{
 const rows=await all(db,`SELECT t.id,t.title,t.description,substr(r.content,1,500) AS preview,
 producer.name AS author,s.created_at AS accepted_at
 FROM tasks t JOIN results r ON r.id=t.accepted_result_id
 JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author
 LEFT JOIN acceptance_snapshots s ON s.result_id=r.id
 WHERE ${trophyWhere} ORDER BY accepted_at DESC,t.id`);
 return rows.map((row:any)=>({id:row.id,title:humanCopy(row).title,excerpt:activityPreview(row.preview,240),author:row.author,acceptedAt:row.accepted_at}));
}
