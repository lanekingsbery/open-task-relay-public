import {env} from 'cloudflare:workers';
import {oaiReportResponse} from '@/lib/oai-pmh';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return oaiReportResponse(env.DB,(await params).id)}
