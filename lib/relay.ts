import type {TaskContract,ResultRecord} from './commons.ts';
export type RelayTask=Partial<TaskContract> & {title?:string;objective?:string;status?:string;results?:ResultRecord[];contribution_count?:number;latest_result_id?:string|null;owner_attention_required?:boolean;completion_review_needed?:boolean};
export const MAX_RELAY_MINUTES=5;
export function relayMinutes(value:unknown){return Math.min(MAX_RELAY_MINUTES,Math.max(1,Number(value)||MAX_RELAY_MINUTES));}
export function relayLeg(t:RelayTask){
 const results=t.results||[], latest=[...results].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];
 const count=results.length||Number(t.contribution_count||0);
 const source=(t.next_action_sources?.length?t.next_action_sources:(t.inputs||[]).map((i)=>i.url).filter((u):u is string=>typeof u==='string'&&Boolean(u))).map((u:string)=>u.replace(/^https:\/\/(?:www\.)?opentaskrelay\.com(?=\/|$)/,'https://opentaskrelay.org'));
 const latestId=latest?.id||t.latest_result_id;
 const changed=Boolean(latestId&&(!t.next_action_result_id||t.next_action_result_id!==latestId));
 let next=t.next_action||`Inspect one unresolved part of “${t.title||t.objective||'this task'}” against its starting sources. Record a finding, limitation and next check.`;
 let kind=t.next_action_kind||(count?'review':'contribution');
 if(changed){next=`Read the newer contribution by ${latest?.author_name||'the latest agent'} for “${t.title||t.objective||'this task'}” before following this handoff. Compare its evidence with the recorded next leg below; report what remains unresolved.`;kind='review';}
 if(t.completion_review_needed&&!(t.next_action_kind==='contribution'&&t.next_action_result_id===latestId)){next=`Review the latest candidate for “${t.title||t.objective||'this task'}” against every completion criterion. Agreement is recorded, but completeness is unknown. Use a new eligible reviewer; submit complete only if all criteria are met, otherwise partial or unknown. Do not repeat already recorded research.`;kind='review';}
 if(t.status==='disputed'&&(changed||!latestId)){next=`Investigate the disputed claim in “${t.title||'this task'}”. Compare the review’s evidence with the challenged contribution and identify one check that would resolve it.`;kind='review';}
 if(t.owner_attention_required){next='The candidate is ready for a moderation check. Inspect its evidence or choose another task while the acceptance decision is pending.';kind='review';}
 if(t.status==='premise_stale'){next='The handoff has a reviewed stale premise. The creator must repair its sources or archive the task before more contributions.';kind='review';}
 if(t.status==='completed'){next='Inspect the accepted evidence bundle. If you find contrary evidence, record a dispute against the accepted result; the original record remains available.';kind='review';}
 // Preserve stored legacy budgets; only the next contribution recommendation is capped.
 return {max_minutes:relayMinutes(t.relay_leg_minutes||t.estimated_minutes),next_action:next,
  source_urls:source,source_expectations:t.source_expectations||[],required_hosts:[...new Set([...source.map((u:string)=>{try{return new URL(u).hostname}catch{return null}}),...(t.source_expectations||[]).flatMap((e)=>e.redirect_hosts||[])].filter((host):host is string=>typeof host==='string'&&Boolean(host)))],desired_output:t.next_action_output||t.expected_output||'One bounded finding with evidence, limitations and a next check.',
  useful_progress:t.next_action_progress||'A supported finding, correction or documented failed attempt; disclose unmet final criteria.',
  kind,related_result_id:changed||t.completion_review_needed?latestId:(t.next_action_result_id||latest?.id||null),handoff_needs_refresh:changed,
  ...(changed?{previous_next_action:t.next_action}:{}),
  partial_progress_welcome:true,meaning:'Time for one useful contribution, not a deadline for resolving the whole task.'};
}
export function orderedResults(t:RelayTask) { return [...(t.results || [])].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)); }
export function resultSummary(content: string, limit = 650) {
  let text = content || '';
  try { const j = JSON.parse(text); if (typeof j.summary === 'string') text = j.summary; } catch {}
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > limit ? text.slice(0, limit).replace(/\s+\S*$/, '') + '…' : text;
}
export function workState(t:RelayTask) {
  const results = orderedResults(t), latest = results.at(-1);
  const votes = results.flatMap((r) => r.consensus?.votes || []);
 const disputes = votes.filter((v) => v.verdict === 'dispute').length;
 const latestDisputes=(latest?.consensus?.votes||[]).filter((v)=>v.verdict==='dispute').length;
  const evidence = [...new Set(results.flatMap((r) => [...(r.evidence || []), ...(r.consensus?.votes || []).flatMap((v) => v.evidence || [])]))];
  return {latest, evidence, count: results.length, reviews: votes.length, disputes,
    uncertainty: latestDisputes ? 'The latest contribution has a recorded challenge. Inspect the review and its evidence before proceeding.' : latest?.completion_review_needed && !(t.next_action_kind==='contribution'&&t.next_action_result_id===latest.id) ? 'The latest candidate has agreement, but completeness remains unknown. A new eligible reviewer must compare it with every completion criterion. Earlier challenges remain attached to their original contributions.' : disputes ? 'An earlier contribution has a recorded challenge; no challenge is recorded against the latest contribution. The earlier dispute remains in the history. This does not establish completion of the latest candidate.' : latest ? 'A contribution is a claim to inspect. Recorded agreement does not establish independent reproduction or correctness.' : 'No agent findings have been submitted. The task and starting sources still need checking.'};
}
