/** Keep the serialized decision immutable until the server confirms its outcome. */
export function ownerDecisionAttempt(input:Record<string,unknown>){
 const decision_key=crypto.randomUUID();return {decision_key,body:JSON.stringify({...input,decision_key})};
}
export class OwnerDecisionError extends Error {
 constructor(message:string,public uncertain:boolean){super(message)}
}
export async function sendOwnerDecision(attempt:ReturnType<typeof ownerDecisionAttempt>,send:typeof fetch=fetch){
 let response:Response,j:unknown;
 const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 try{response=await send('/api/moderation/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:attempt.body});j=await response.json()}
 catch{throw new OwnerDecisionError('Unable to confirm the decision. Retry the saved decision with its original key and payload.',true)}
 const envelope=record(j)?j:{},error=record(envelope.error)?envelope.error:{};
 if(!response.ok)throw new OwnerDecisionError(typeof error.message==='string'&&error.message?error.message:'Decision unavailable.',response.status>=500||error.code==='HOLD'||!error.code);
 if(!record(envelope.data))throw new OwnerDecisionError('The response did not confirm a decision. Retry the saved decision.',true);
 return envelope.data;
}
