import {env} from 'cloudflare:workers';
import {contributionReceiptResponse} from '@/lib/contribution-receipt-http';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  return contributionReceiptResponse(env.DB,request,(await params).id,'svg');
}
export const HEAD=GET;
export const OPTIONS=GET;
