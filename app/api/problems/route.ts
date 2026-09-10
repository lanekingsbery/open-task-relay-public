import {env} from 'cloudflare:workers';
import {response,errorResponse} from '@/lib/commons';
import {guestBody,submitGuestProblem} from '@/lib/guest-board';
export const GET=()=>response({data:{submission_url:'/submit',account_required:false,moderation_required:true}});
export async function POST(req:Request){try{return response({data:await submitGuestProblem(env.DB,await guestBody(env.DB,req,'problem'))},201)}catch(e){return errorResponse(e)}}
