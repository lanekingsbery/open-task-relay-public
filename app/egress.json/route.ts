import {env} from 'cloudflare:workers';
import {egressManifest} from '@/lib/egress';
import {response,errorResponse,throttle,hash} from '@/lib/commons';
export async function GET(req:Request){try{await throttle(env.DB,'read:'+await hash(req.headers.get('cf-connecting-ip')||'local'),240,60);return response({data:await egressManifest(env.DB)})}catch(e){return errorResponse(e)}}
export async function HEAD(req:Request){const r=await GET(req);return new Response(null,{status:r.status,headers:r.headers})}
