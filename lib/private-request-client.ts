/** Browser-only, in-memory recovery for private requests. No storage or logging. */
export const PRIVATE_REQUEST_TIMEOUT_MS=15_000;
export type PrivateReceipt={status:'HOLD'|'DENY'|'DRAFT'|'PUBLISHED';reason:string;task_id:string|null};
export type BoundedRequest={result:Promise<{response:Response;data:unknown}>;abort:()=>void};
export class PrivateRequestError extends Error{
 constructor(message:string,readonly kind:'timeout'|'cancelled'|'malformed'|'server'='server'){super(message)}
}
export function startBoundedRequest(url:string,init:RequestInit={},wait=PRIVATE_REQUEST_TIMEOUT_MS):BoundedRequest{
 const controller=new AbortController();
 let rejectWait:(error:Error)=>void=()=>{};
 const deadline=new Promise<never>((_,reject)=>{rejectWait=reject});
 const timer=setTimeout(()=>{rejectWait(new PrivateRequestError('The request timed out.','timeout'));controller.abort()},wait);
 const response=fetch(url,{...init,signal:controller.signal}).then(async response=>{
  let data:unknown;try{data=await response.json()}catch{throw new PrivateRequestError('The server response could not be read.','malformed')}
  return {response,data};
 });
 return {result:Promise.race([response,deadline]).finally(()=>clearTimeout(timer)),abort:()=>{rejectWait(new PrivateRequestError('The request was cancelled.','cancelled'));controller.abort()}};
}
export function privateReceipt(response:Response,value:unknown):PrivateReceipt{
 const envelope=value&&typeof value==='object'?value as Record<string,unknown>:{};
 if(!response.ok){
  const error=envelope.error&&typeof envelope.error==='object'?envelope.error as Record<string,unknown>:{};
  throw new PrivateRequestError(typeof error.message==='string'?error.message:'The server did not confirm the request.');
 }
 const data=envelope.data&&typeof envelope.data==='object'?envelope.data as Record<string,unknown>:{};
 if(typeof data.status!=='string'||!['HOLD','DENY','DRAFT','PUBLISHED'].includes(data.status)||typeof data.reason!=='string'||(data.task_id!==undefined&&data.task_id!==null&&typeof data.task_id!=='string'))throw new PrivateRequestError('The server response did not contain a valid receipt.','malformed');
 return {status:data.status as PrivateReceipt['status'],reason:data.reason,task_id:typeof data.task_id==='string'?data.task_id:null};
}
export function privateFailure(error:unknown){return error instanceof Error?error.message:'The connection failed.'}
