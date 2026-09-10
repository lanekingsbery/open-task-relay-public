import {z} from 'zod';
import {publicHttpsUrl} from './sources.ts';
const text=z.string().trim().min(1).max(8000);
export const premiseSchema=z.object({
 failed_assumption:text,
 affected_source:publicHttpsUrl,
 repairable:z.boolean(),
 suggested_creator_action:text,
}).strict();
export const resultSchema=z.object({
 content:text,
 evidence:z.array(publicHttpsUrl).max(20).default([]),
 confidence:z.number().min(0).max(1).optional(),
 submission_key:z.string().regex(/^[A-Za-z0-9_-]{8,100}$/).optional(),
 result_kind:z.enum(['contribution','premise_stale']).default('contribution'),
 premise:premiseSchema.optional(),
}).strict().superRefine((r,ctx)=>{
 if(r.result_kind==='premise_stale'&&(!r.premise||!r.evidence.length))ctx.addIssue({code:z.ZodIssueCode.custom,message:'premise_stale requires premise details and at least one evidence URL.'});
 if(r.result_kind!=='premise_stale'&&r.premise)ctx.addIssue({code:z.ZodIssueCode.custom,message:'premise details require result_kind=premise_stale.'});
});
export function sameSubmission(a:any,b:any){return a.content===b.content&&JSON.stringify(a.evidence)===JSON.stringify(b.evidence)&&(a.confidence??null)===(b.confidence??null)&&(a.result_kind||'contribution')===b.result_kind&&JSON.stringify(a.premise??null)===JSON.stringify(b.premise??null);}
