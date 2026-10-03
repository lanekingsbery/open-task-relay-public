/** The only chat write capability: a signed, visitor-confirmed private inbox submission. */
import {z} from 'zod';
import {body,ApiError} from '../lib/commons.ts';
import {chatProposalSchema,type ChatProposal,type IntakePreview} from '../lib/relay-intake-proposal.ts';
import {chatIpKey} from '../lib/relay-chat-store.ts';
import {submitRequest} from '../lib/relay-requests.ts';
import {sourceSchema} from '../lib/relay-operator-store.ts';
import type {ChatEnv} from './relay-chat-api.ts';
const confirmation=z.object({proposal:chatProposalSchema,request_key:z.string().regex(/^[a-f0-9]{64}$/),
 expires:z.number().int(),signature:z.string().regex(/^[a-f0-9]{64}$/),confirm:z.literal(true)}).strict();
export function intakeEnabled(env:ChatEnv){return env.RELAY_SELF_HOSTED==='true'&&env.RELAY_OPERATOR_ENABLED==='true'&&env.RELAY_CHAT_ENABLED==='true'&&env.MIGRATION_FREEZE!=='true'&&!!env.RELAY_CHAT_IP_SECRET&&env.RELAY_CHAT_IP_SECRET.length>=32&&sourceSchema.safeParse(env.RELAY_SHADOW_SOURCE_VERSION).success}
async function signature(request:Request,env:ChatEnv,value:Omit<IntakePreview,'signature'>){
 const ip=request.headers.get('cf-connecting-ip');if(!ip||ip.length>64)throw Error('NO_IP');
 return chatIpKey(JSON.stringify({origin:new URL(request.url).origin,ip,...value}),env.RELAY_CHAT_IP_SECRET!,'relay-intake-v1.8');
}
export async function previewIntake(request:Request,env:ChatEnv,proposal:ChatProposal):Promise<IntakePreview|null>{
 if(!intakeEnabled(env)||!await env.DB.prepare('SELECT id FROM relay_operator_control WHERE id=1 AND enabled=1').first())return null;
 const value={proposal:chatProposalSchema.parse(proposal),request_key:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),expires:Date.now()+30*60_000};
 return {...value,signature:await signature(request,env,value)};
}
export async function confirmIntake(request:Request,env:ChatEnv):Promise<Response>{
 const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
 try{
  const url=new URL(request.url);
  if(request.method!=='POST')throw new ApiError(405,'METHOD_NOT_ALLOWED','Confirm using the chat preview.');
  if(url.search||request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'ORIGIN_REJECTED','Confirm on this site.');
  if(!intakeEnabled(env))throw new ApiError(503,'PAUSED','Chat intake is paused.');
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new ApiError(415,'INVALID_INPUT','Use the chat preview.');
  const {signature:sig,confirm,...value}=confirmation.parse(await body(request));
  void confirm;
  if(value.expires<Date.now()||value.expires>Date.now()+30*60_000)throw new ApiError(409,'EXPIRED','Preview expired. Ask Relay to propose the task again.');
  const expected=await signature(request,env,value);
  // Constant-work comparison; the signature is never a credential for any other route.
  let mismatch=0;for(let i=0;i<64;i++)mismatch|=sig.charCodeAt(i)^expected.charCodeAt(i);
  if(mismatch)throw new ApiError(403,'INVALID_PREVIEW','Proposal changed. Ask Relay for a new preview.');
  const result=await submitRequest(env.DB,{...value.proposal,request_key:value.request_key},request.headers.get('cf-connecting-ip')!,env.RELAY_SHADOW_SOURCE_VERSION!,'chat');
  return respond({data:result},201);
 }catch(e){
  if(e instanceof ApiError)return respond({error:{code:e.code,message:e.message}},e.status);
  return respond({error:{code:'INVALID_PREVIEW',message:'No confirmed submission was completed. Retry the same preview, or prepare a new one.'}},422);
 }
}
