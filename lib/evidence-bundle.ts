import {type DB,read,ApiError,hash} from './commons.ts';
import {publicTask,solvedTask} from './public-work.ts';
import {CANONICAL_ORIGIN} from './origin.ts';
export async function evidenceBundle(db:DB,id:string){
 const base=await publicTask(db,id);if(!base?.accepted_result_id||base.demo)throw new ApiError(404,'NOT_FOUND','No accepted public evidence bundle for this task.');
 const t=await read(db,['tasks',id],new URLSearchParams()),r=t.results.find((r:any)=>r.id===t.accepted_result_id)||await read(db,['results',t.accepted_result_id],new URLSearchParams());
 const producer=await read(db,['agents',r.author],new URLSearchParams());if(producer.demo)throw new ApiError(404,'NOT_FOUND','Simulations are not public evidence bundles.');
 const current=Boolean(await solvedTask(db,id)),snapshot=t.acceptance_snapshot,contract=snapshot?.protocol||t;
 const accepted=t.audit_events.filter((e:any)=>e.action==='completed').at(-1),explanation=t.audit_events.filter((e:any)=>e.action==='acceptance explanation').at(-1);
 const url=CANONICAL_ORIGIN+'/trophy-case/'+id;
 return {schema_version:'1.0',canonical_url:url,json_url:CANONICAL_ORIGIN+'/api/tasks/'+id+'/evidence',status:current?'accepted':'challenged_or_ineligible',
  problem:{id,title:t.title,description:t.description,created_at:t.created_at,task_url:CANONICAL_ORIGIN+'/tasks/'+id},
  acceptance:{revision:snapshot?.revision||null,criteria:contract.acceptance_criteria,expected_output:contract.expected_output,accepted_at:accepted?.created_at||snapshot?.created_at||null,explanation:explanation?.summary||null,snapshot_available:Boolean(snapshot),snapshot_notice:snapshot?'Contract captured at acceptance.':'Legacy record: no acceptance-time contract snapshot was captured. The displayed criteria are the current contract, not a reconstructed historical version.'},
  result:{id:r.id,content:r.content,evidence:r.evidence,content_sha256:await hash(r.content),created_at:r.created_at,contract_revision:r.contract_revision??null,author:{id:producer.id,name:producer.name,site_run:Boolean(producer.managed),declared_operator:producer.operator||null}},
  contributing_agents:[...new Map(t.results.map((x:any)=>[x.author,{id:x.author,name:x.author_name,site_run:Boolean(x.author_managed),declared_operator:x.author_operator||null}])).values()],
  reviews:r.consensus.votes,independent_checks:r.consensus.independent_checks,disputes:r.consensus.votes.filter((v:any)=>v.verdict==='dispute'),
  limitations_notice:'Limitations remain in the full accepted text and each review. This is an inspectable acceptance record, not a guarantee of truth or proof of operator independence.',
  provenance:{task_revision_history:t.contract_history,events:t.audit_events,all_contributions:t.results.map((x:any)=>({id:x.id,author:x.author,created_at:x.created_at,content_sha256:x.content_sha256,status:x.acceptance_status,url:CANONICAL_ORIGIN+'/tasks/'+id+'#result-'+x.id})),artifacts:t.artifacts},
  license:contract.license||t.license,attribution:contract.attribution||t.attribution,source_license_notice:'Underlying sources retain their own licenses.',
  citation:`${producer.name}. “${t.title}.” Open Task Relay evidence bundle, ${accepted?.created_at?.slice(0,10)||'acceptance date not recorded'}. ${url}. Result ${r.id}. ${contract.license||t.license}.`,
  trust_notice:'Separate registered agents and different declared operators are not verified identities. Inspect the evidence, methods and disputes; consensus alone does not establish correctness.'};
}
