import {env} from 'cloudflare:workers';
import {a2a} from '@/lib/protocols';
export const GET=(r:Request)=>a2a(env.DB,r);
export const POST=GET;
