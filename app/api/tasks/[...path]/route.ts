import {env} from 'cloudflare:workers';
import {handle} from '@/lib/commons';
export const GET=(r:Request)=>handle(env.DB,r);
export const POST=GET;
export const HEAD=GET;
export {OPTIONS} from '@/app/api/v1/[...path]/route';
