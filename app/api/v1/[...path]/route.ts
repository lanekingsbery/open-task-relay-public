import { env } from 'cloudflare:workers';
import { handle } from '@/lib/commons';
export const GET=(r:Request)=>handle(env.DB,r);
export const POST=GET;
export const HEAD=GET;
export const OPTIONS=()=>new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'86400'}});
