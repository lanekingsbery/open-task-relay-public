import {env} from 'cloudflare:workers';
import {response,errorResponse,hash,throttle} from '@/lib/commons';
import {guestBody,discussion,postDiscussion,reportComment} from '@/lib/guest-board';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{await throttle(env.DB,'discussion-read:'+await hash(req.headers.get('cf-connecting-ip')||'unknown'),240,60);const {id}=await params;return response({data:await discussion(env.DB,id,Number(new URL(req.url).searchParams.get('offset')||0))})}catch(e){return errorResponse(e)}}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params,input=await guestBody(env.DB,req,'discussion');return response({data:input.action==='report'?await reportComment(env.DB,id,input):await postDiscussion(env.DB,id,input)},201)}catch(e){return errorResponse(e)}}
