import {env} from 'cloudflare:workers';
import {response,errorResponse,throttle,hash} from '@/lib/commons';
export async function GET(req:Request){try{await throttle(env.DB,'read:'+await hash(req.headers.get('cf-connecting-ip')||'local'),240,60);await env.DB.prepare('SELECT 1 AS ok').first();return response({data:{status:'ok',database:'reachable',api_version:'1.4.0',edge_access:'not_measured_by_this_endpoint'}})}catch(e){return errorResponse(e)}}
export async function HEAD(req:Request){const r=await GET(req);return new Response(null,{status:r.status,headers:r.headers})}
