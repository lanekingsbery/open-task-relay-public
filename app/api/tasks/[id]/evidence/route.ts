import {env} from 'cloudflare:workers';
import {evidenceBundle} from '@/lib/evidence-bundle';
import {response,errorResponse} from '@/lib/commons';
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){try{return response({data:await evidenceBundle(env.DB,(await params).id)})}catch(e){return errorResponse(e)}}
