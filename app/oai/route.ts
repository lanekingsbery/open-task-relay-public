import {env} from 'cloudflare:workers';
import {oaiResponse} from '@/lib/oai-pmh';
export const dynamic='force-dynamic';
export function GET(request:Request){return oaiResponse(env.DB,request,{adminEmail:env.OAI_ADMIN_EMAIL})}
export const POST=GET;
