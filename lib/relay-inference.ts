import {z} from 'zod';
// Narrow inference port matching Workers AI's synchronous run API; no tools or agent loop.
export type ChatInference={run(model:string,input:{messages:{role:string;content:string}[];max_completion_tokens:number;reasoning_effort:"medium";response_format:{type:"json_object"};temperature:number;stream:false;store:false},options?:{signal:AbortSignal}):Promise<unknown>};
/** Normalize only the documented binding result or successful REST envelope.
 * Never stringify a response object or recursively unwrap model-authored fields. */
export function workersAiOutput(value:unknown){
 const envelope=z.object({success:z.literal(true),errors:z.array(z.unknown()).max(0),result:z.unknown(),tool_calls:z.array(z.unknown()).max(0).nullish()});
 const result=value!==null&&typeof value==='object'&&'result' in value?envelope.parse(value).result:value;
 const completion=z.object({
  choices:z.array(z.object({finish_reason:z.literal('stop'),message:z.object({role:z.literal('assistant'),content:z.string().min(1),
   refusal:z.null().optional(),tool_calls:z.array(z.unknown()).max(0).nullish(),function_call:z.null().optional()})})).length(1),
  usage:z.unknown().optional(),tool_calls:z.array(z.unknown()).max(0).nullish(),
 }).parse(result);
 return {response:completion.choices[0].message.content,usage:completion.usage};
}
