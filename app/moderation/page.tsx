import {env} from 'cloudflare:workers';
import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {authorizeModerator} from '@/lib/moderation';
import Moderation from '@/components/moderation';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/moderation');try{authorizeModerator(user.email,env.MODERATOR_EMAIL)}catch{return <main><h1>Owner access required</h1><a href="/">Return to public tasks</a></main>}return <Moderation/>}
