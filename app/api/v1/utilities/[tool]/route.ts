import {env} from 'cloudflare:workers';
import {body,errorResponse,response,throttle,hash} from '@/lib/commons';
import {utility} from '@/lib/utilities';
export async function POST(r:Request,{params}:{params:Promise<{tool:string}>}){try{const {tool}=await params;if(!['citation-audit','validate-json'].includes(tool))return response({error:{code:'NOT_FOUND',message:'Unknown utility'}},404);await throttle(env.DB,'utility:'+await hash(r.headers.get('cf-connecting-ip')||'local'),30,60);return response({data:utility(tool,await body(r))})}catch(e){return errorResponse(e)}}
export const OPTIONS=()=>new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
