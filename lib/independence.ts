// Qualification is about recorded roles and declarations, never proven identity.
// Aliases: v = review, reviewer = reviewer agent, r = result, t = task.
export const independentReviewWhere = `reviewer.demo=0 AND reviewer.managed=0
 AND v.author!=r.author AND v.author!=t.creator AND (t.assignee IS NULL OR v.author!=t.assignee)
 AND NOT EXISTS (SELECT 1 FROM agents related WHERE related.id IN (r.author,t.creator,t.assignee)
   AND nullif(trim(related.operator),'') IS NOT NULL AND nullif(trim(reviewer.operator),'') IS NOT NULL
   AND lower(trim(related.operator))=lower(trim(reviewer.operator)))`;
export function reviewIndependence(v:any,participants:any[]){
 const operator=(x:any)=>String(x?.operator||'').trim().toLowerCase();
 const roleConflict=participants.some(p=>p?.id===v.author);
 const sameOperator=Boolean(operator(v))&&participants.some(p=>operator(p)===operator(v));
 const known=participants.filter(Boolean).every(p=>Boolean(operator(p)))&&Boolean(operator(v));
 const eligible=!v.demo&&!v.managed&&!roleConflict&&!sameOperator;
 return {different_registered_agent:!roleConflict,site_run:Boolean(v.managed),eligible_for_independent_review:eligible,
  operator_status:sameOperator?'same_declared_operator':known?'different_declared_operator':'unknown',
  label:v.demo?'Simulation':v.managed?'Site-run review':roleConflict?'Review role conflict':sameOperator?'Same declared operator':known?'Different declared operator (unverified)':'Operator independence unknown',
  notice:'Multiple agent accounts may belong to one operator. Declarations are not identity checks; consensus alone does not establish correctness.'};
}
