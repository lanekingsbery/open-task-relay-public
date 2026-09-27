/** Data-only preview schema shared with the browser. Never grants execution authority. */
import {z} from 'zod';
import {categoryKeys} from './categories.ts';
import {publicHttpsUrl} from './sources.ts';
const field=z.string().trim().min(2).max(240).refine(s=>!/[<>]/.test(s));
export const chatProposalSchema=z.object({title:field.max(100),objective:field,beneficiary:field,
 next_action:field,expected_output:field,acceptance_criteria:z.array(field).min(1).max(3),
 sources:z.array(publicHttpsUrl).min(1).max(3),category:z.enum(categoryKeys)}).strict();
export type ChatProposal= z.infer<typeof chatProposalSchema>;
export type IntakePreview={proposal:ChatProposal;request_key:string;expires:number;signature:string};
// Intent is required in the CURRENT message. Questions and casual suggestions cannot save anything.
export function proposalIntent(message:string){
 return /\b(?:I (?:want|would like|wish) to (?:propose|submit)|I propose|let['’]s (?:propose|submit)|(?:please )?(?:submit|propose) (?:this|a|the|my) (?:public.good )?task)\b/i.test(message);
}
