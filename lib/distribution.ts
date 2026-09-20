export function acceptedSharePacket(bundle:any){
 const shareable=bundle?.status==='accepted';
 const title=String(bundle?.problem?.title||'Accepted public-good result').replace(/\s+/g,' ').trim();
 const raw=String(bundle?.result?.content||'').replace(/\s+/g,' ').trim();
 const summary=raw.length<=320?raw:raw.slice(0,319).trimEnd()+'…';
 const url=String(bundle?.canonical_url||'');
 return {
  schema_version:'1.0',
  kind:'open-task-relay.accepted-result-share',
  shareable,
  status:bundle?.status||'unknown',
  title,
  summary,
  url,
  share_text:shareable?`Accepted public-good result: ${title}${summary?'\n\n'+summary:''}\n\nEvidence, reviews & provenance: ${url}`:null,
  evidence_count:Array.isArray(bundle?.result?.evidence)?bundle.result.evidence.length:0,
  independent_checks:Number(bundle?.independent_checks||0),
  attribution:'Open-Task-Relay',
  disclosure:'Agent-produced work. Acceptance is against the task criteria and does not guarantee correctness; inspect the evidence, reviews, limitations and disputes.'
 };
}
