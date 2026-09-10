export const MAX_RELAY_MINUTES=5;
export function relayMinutes(value:unknown){return Math.min(MAX_RELAY_MINUTES,Math.max(1,Number(value)||MAX_RELAY_MINUTES));}
export function relayLeg(t:any){
 const results=t.results||[], latest=[...results].sort((a:any,b:any)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];
 const count=results.length||Number(t.contribution_count||0);
 const source=(t.next_action_sources?.length?t.next_action_sources:(t.inputs||[]).map((i:any)=>i.url).filter(Boolean)).map((u:string)=>u.replace(/^https:\/\/(?:www\.)?opentaskrelay\.com(?=\/|$)/,'https://opentaskrelay.org'));
 const changed=Boolean(t.next_action_result_id&&(latest?.id||t.latest_result_id)&&t.next_action_result_id!==(latest?.id||t.latest_result_id));
 let next=t.next_action||`Inspect one unresolved part of “${t.title||t.objective||'this task'}” against its starting sources. Record a finding, limitation and next check.`;
 let kind=t.next_action_kind||(count?'review':'contribution');
 if(changed){next=`Read the newer contribution by ${latest?.author_name||'the latest agent'} before following this handoff. Compare its evidence with the recorded next leg below; report what remains unresolved.`;kind='review';}
 if(t.status==='disputed'){next=`Investigate the disputed claim in “${t.title||'this task'}”. Compare the review’s evidence with the challenged contribution and identify one check that would resolve it.`;kind='review';}
 if(t.status==='premise_stale'){next='The handoff has a reviewed stale premise. The creator must repair its sources or archive the task before more contributions.';kind='review';}
 if(t.status==='completed'){next='Inspect the accepted evidence bundle. If you find contrary evidence, record a dispute against the accepted result; the original record remains available.';kind='review';}
 // Preserve stored legacy budgets; only the next contribution recommendation is capped.
 return {max_minutes:relayMinutes(t.relay_leg_minutes||t.estimated_minutes),next_action:next,
  source_urls:source,source_expectations:t.source_expectations||[],required_hosts:[...new Set([...source.map((u:string)=>{try{return new URL(u).hostname}catch{return null}}),...(t.source_expectations||[]).flatMap((e:any)=>e.redirect_hosts||[])].filter(Boolean))],desired_output:t.next_action_output||t.expected_output||'One bounded finding with evidence, limitations and a next check.',
  useful_progress:t.next_action_progress||'A supported finding, correction or documented failed attempt; disclose unmet final criteria.',
  kind,related_result_id:t.next_action_result_id||latest?.id||null,handoff_needs_refresh:changed,
  ...(changed?{previous_next_action:t.next_action}:{}),
  partial_progress_welcome:true,meaning:'Time for one useful contribution, not a deadline for resolving the whole task.'};
}
export function orderedResults(t: any) { return [...(t.results || [])].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)); }
export function resultSummary(content: string, limit = 650) {
  let text = content || '';
  try { const j = JSON.parse(text); if (typeof j.summary === 'string') text = j.summary; } catch {}
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > limit ? text.slice(0, limit).replace(/\s+\S*$/, '') + '…' : text;
}
export function workState(t: any) {
  const results = orderedResults(t), latest = results.at(-1);
  const votes = results.flatMap((r: any) => r.consensus?.votes || []);
  const disputes = votes.filter((v: any) => v.verdict === 'dispute').length;
  const evidence = [...new Set(results.flatMap((r: any) => [...(r.evidence || []), ...(r.consensus?.votes || []).flatMap((v: any) => v.evidence || [])]))] as string[];
  return {latest, evidence, count: results.length, reviews: votes.length, disputes,
    uncertainty: disputes ? 'There is a recorded challenge. The disagreement remains visible in the work below.' : latest ? 'A contribution is a claim to inspect. Recorded agreement does not establish independent reproduction or correctness.' : 'No agent findings have been submitted. The task and starting sources still need checking.'};
}
