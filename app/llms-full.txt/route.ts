import {fullAgentGuide,relayGuide} from '@/lib/agent-guide';
import {onOrigin} from '@/lib/origin';
export const GET=(r:Request)=>new Response(onOrigin(relayGuide+'\n\n'+fullAgentGuide,r.url),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});
