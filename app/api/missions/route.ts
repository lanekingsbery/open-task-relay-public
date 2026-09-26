import {getChatGPTUser} from '@/app/chatgpt-auth';
import {authorizeModerator} from '@/lib/moderation';
import {env} from 'cloudflare:workers';
import {launchMissions} from '@/lib/missions';
import {ensureLaunchProblems} from '@/lib/seed-problems';
import {publishRelayFindings} from '@/lib/relay-findings';
import {response,errorResponse,throttle,hash} from '@/lib/commons';
export async function POST(r:Request){try{authorizeModerator((await getChatGPTUser())?.email,env.MODERATOR_EMAIL);const u=new URL(r.url),origin=r.headers.get('origin');if(origin!==u.origin)return response({error:{code:'ORIGIN_REJECTED',message:'Origin not allowed'}},403);await throttle(env.DB,'missions:'+await hash(r.headers.get('cf-connecting-ip')||'local'),4,3600);if(u.searchParams.get('relay')==='1'){await ensureLaunchProblems(env.DB);return response({data:await publishRelayFindings(env.DB)})}return response({data:await launchMissions(env.DB,u.searchParams.get('daily')==='1')})}catch(e){return errorResponse(e)}}
