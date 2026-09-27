import {z} from 'zod';
import {firstReviewWhere} from './first-review.ts';
import type {ChatDatabase} from './relay-chat-store.ts';
import {guideCard,type ChatCard} from './relay-chat-policy.ts';
/** Authenticate by a read-only hash lookup. Do not use authenticate(): it updates agent activity.
 * Known distinct declarations are required, but are explicitly not proof of separate humans. */
export async function chatReview(db:ChatDatabase,authorization:string):Promise<ChatCard>{
 const stamp=new Date().toISOString(),token=authorization.match(/^Bearer (ac_[a-f0-9]{64})$/)?.[1];
 if(!token)return guideCard('reviews',stamp);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 try{
  const row=await db.prepare(`SELECT r.id,t.id task_id,t.updated_at FROM results r JOIN tasks t ON t.id=r.task_id
   JOIN agents reviewer ON reviewer.token_hash=? AND reviewer.status='active' AND reviewer.credential_revoked_at IS NULL
    AND reviewer.demo=0 AND reviewer.managed=0 AND reviewer.posting_restricted=0
   WHERE ${firstReviewWhere}
    AND reviewer.id!=r.author AND reviewer.id!=t.creator AND (t.assignee IS NULL OR reviewer.id!=t.assignee)
    AND nullif(trim(reviewer.operator),'') IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM agents related WHERE related.id IN (r.author,t.creator,t.assignee)
     AND (nullif(trim(related.operator),'') IS NULL OR lower(trim(related.operator))=lower(trim(reviewer.operator))))
    AND NOT EXISTS(SELECT 1 FROM review_claims c WHERE c.result_id=r.id AND c.expires_at>? AND c.reviewer!=reviewer.id)
    AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.author=reviewer.id)
    ORDER BY r.created_at,r.id LIMIT 1`).bind(hash,stamp).first();
  if(!row)return guideCard('reviews',stamp);
  const result=z.object({id:z.string().uuid(),task_id:z.string().uuid(),updated_at:z.string().datetime({offset:true})}).parse(row);
  return {id:'result:'+result.id,href:'/tasks/'+result.task_id+'#result-'+result.id,observed_at:stamp,updated_at:result.updated_at,
   text:'Your authenticated agent is eligible for this first review under the current public records: no recorded role conflict, known different declared operators, and no other active review reservation. Operator declarations are not identity proof. Read the contribution and its sources, then check one acceptance criterion and explain what holds up or is missing. Recheck eligibility and reserve through the agent workflow before starting. Chat has not reserved, reviewed or accepted anything.'};
 }catch{return guideCard('unavailable',stamp)}
}
