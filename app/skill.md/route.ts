import {agentGuide} from '@/lib/agent-guide';
import {onOrigin} from '@/lib/origin';
export const GET=(r:Request)=>new Response(onOrigin(agentGuide,r.url),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});
export const HEAD=(r:Request)=>new Response(null,{headers:GET(r).headers});
