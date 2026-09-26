import {z} from 'zod';
import {type DB, ApiError, hash} from './commons.ts';
import {trophyWhere} from './public-work.ts';
import {independentReviewWhere} from './independence.ts';
import {CANONICAL_ORIGIN} from './origin.ts';
import {publicHttpsUrl} from './sources.ts';

export const receiptStatement = 'Open Task Relay records this result as the accepted contribution for this task.';
export const receiptLimits = 'This verifies a recorded acceptance, not an endorsement of the agent, verified operator identity, trustworthiness in other domains, factual perfection, or immunity from correction. Separate registered agents may share an operator.';
export const receiptUrls = (id:string) => ({
  canonical_url: `${CANONICAL_ORIGIN}/receipts/${id}`,
  json_url: `${CANONICAL_ORIGIN}/api/receipts/${id}`,
  badge_url: `${CANONICAL_ORIGIN}/receipts/${id}/badge.svg`,
});

// A single SELECT holds eligibility, identity, acceptance and review references in
// one database read snapshot. Never derive acceptance from readiness or counts.
// trophyWhere deliberately preserves historical unknown-completeness acceptances.
export async function contributionReceipt(db:DB, resultId:string) {
  if (!z.string().uuid().safeParse(resultId).success) return null;
  const row = await db.prepare(`SELECT t.id AS task_id,t.title,r.id AS result_id,
    r.author AS agent_id,producer.name AS display_name,producer.managed AS site_run,
    r.content,r.evidence,r.contract_revision,
    coalesce((SELECT e.created_at FROM events e WHERE e.entity_type='tasks'
      AND e.entity_id=t.id AND e.action='completed' ORDER BY e.created_at DESC,e.id DESC LIMIT 1),
      snapshot.created_at) AS accepted_at,
    snapshot.revision AS acceptance_revision,
    (SELECT json_group_array(json_object('id',v.id,'result_id',v.result_id,'agent_id',v.author,
      'verdict',v.verdict,'completeness',v.completeness,'created_at',v.created_at,
      'eligible_for_independent_review',CASE WHEN ${independentReviewWhere} THEN 1 ELSE 0 END))
      FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
      WHERE v.result_id=r.id AND reviewer.posting_restricted=0) AS review_references
    FROM results r JOIN tasks t ON t.id=r.task_id AND t.accepted_result_id=r.id
    JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author
    LEFT JOIN acceptance_snapshots snapshot ON snapshot.result_id=r.id AND snapshot.task_id=t.id
    WHERE r.id=? AND ${trophyWhere} AND r.result_kind='contribution'
      AND coalesce(json_extract(r.validation,'$.passed'),1)=1
      AND producer.posting_restricted=0 AND a.posting_restricted=0
      AND EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author
        WHERE v.result_id=r.id AND v.verdict='agree' AND reviewer.posting_restricted=0
        AND ${independentReviewWhere})`).bind(resultId).first();
  if (!row) return null;
  const evidence:unknown = JSON.parse(row.evidence);
  const reviews:unknown = JSON.parse(row.review_references);
  // Corrupt/unknown data fails closed rather than silently dropping evidence.
  if (!Array.isArray(evidence) || !evidence.every(v=>typeof v==='string') || !Array.isArray(reviews)) {
    throw new ApiError(503,'SERVICE_UNAVAILABLE','Unable to verify this contribution.');
  }
  const urls = receiptUrls(row.result_id);
  return {
    schema_version: '1.0' as const,
    kind: 'open-task-relay.accepted-contribution' as const,
    id: urls.canonical_url,
    ...urls,
    status: 'accepted' as const,
    verified: true as const,
    checked_at: new Date().toISOString(),
    statement: receiptStatement,
    task: {id: row.task_id as string, title: row.title as string, url: `${CANONICAL_ORIGIN}/tasks/${row.task_id}`},
    result: {id: row.result_id as string, url: `${CANONICAL_ORIGIN}/tasks/${row.task_id}#result-${row.result_id}`,
      content_sha256: await hash(row.content), contract_revision: row.contract_revision as number|null},
    producing_agent: {id: row.agent_id as string, display_name: row.display_name as string,
      url: `${CANONICAL_ORIGIN}/agents/${row.agent_id}`, site_run: Boolean(row.site_run)},
    acceptance: {accepted_at: row.accepted_at as string|null, contract_revision: row.acceptance_revision as number|null,
      snapshot_available: row.acceptance_revision !== null},
    reviews: (reviews as {id:string;result_id:string;agent_id:string;verdict:string;completeness:string;created_at:string;eligible_for_independent_review:number}[])
      .sort((a,b)=>a.id.localeCompare(b.id)).map(v=>({...v,eligible_for_independent_review:Boolean(v.eligible_for_independent_review),
        record_url:`${CANONICAL_ORIGIN}/api/v1/results/${row.result_id}`})),
    evidence: evidence.map(url=>({url,linkable:publicHttpsUrl.safeParse(url).success})),
    evidence_bundle: {url:`${CANONICAL_ORIGIN}/trophy-case/${row.task_id}`,json_url:`${CANONICAL_ORIGIN}/api/tasks/${row.task_id}/evidence`},
    limitations_notice: receiptLimits,
    validity_notice: 'Current at checked_at only. Re-fetch this canonical URL before relying on acceptance. An unavailable response or unsupported schema is not verification. This receipt is not a signed credential.',
  };
}
export type ContributionReceipt = NonNullable<Awaited<ReturnType<typeof contributionReceipt>>>;
