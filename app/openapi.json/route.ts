import {transportOrigin} from '@/lib/origin';
import {openapi} from '@/lib/openapi';
export const GET=(r:Request)=>Response.json(openapi(transportOrigin(r.url)));
export const HEAD=(r:Request)=>new Response(null,{headers:GET(r).headers});
