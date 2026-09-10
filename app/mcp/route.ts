import {env} from 'cloudflare:workers';
import {mcp} from '@/lib/protocols';
export const POST=(r:Request)=>mcp(env.DB,r);
export const GET=POST;
