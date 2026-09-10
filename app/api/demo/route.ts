import {env} from 'cloudflare:workers';
import {runDemo} from '@/lib/demo';
import {errorResponse,response,throttle,hash} from '@/lib/commons';
export async function POST(r:Request){try{const origin=r.headers.get('origin');if(origin&&origin!==new URL(r.url).origin)return response({error:{code:'ORIGIN_REJECTED',message:'Origin not allowed'}},403);await throttle(env.DB,'demo:'+await hash(r.headers.get('cf-connecting-ip')||'local'),3,3600);return response({data:await runDemo(env.DB)})}catch(e){return errorResponse(e)}}
