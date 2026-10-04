import {all,type DB} from './commons.ts';

export type AcceptedContributor={id:string;name:string;site_run:boolean;declared_operator:string|null;source_result_ids:string[]};
/** Credit is a public projection; the result author remains its historical submitter. */
export async function acceptedContributors(db:DB,resultId:string):Promise<AcceptedContributor[]>{
 const rows=await all<{agent_id:string;name:string;site_run:number;declared_operator:string|null;source_result_ids:string[]}>(db,
  'SELECT * FROM accepted_contributors WHERE result_id=? ORDER BY agent_id',resultId);
 return rows.map(r=>({id:r.agent_id,name:r.name,site_run:Boolean(r.site_run),declared_operator:r.declared_operator,source_result_ids:r.source_result_ids}));
}
export const acceptedContributorNames="coalesce((SELECT group_concat(name, ', ') FROM (SELECT name FROM accepted_contributors WHERE result_id=r.id ORDER BY agent_id)), '')";
