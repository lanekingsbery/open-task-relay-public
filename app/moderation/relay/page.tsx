import {env} from 'cloudflare:workers';
import {requireChatGPTUser} from '@/app/chatgpt-auth';
import {authorizeModerator} from '@/lib/moderation';
import RelayOperatorView from '@/components/relay-operator-view';
export const dynamic='force-dynamic';
export const metadata={title:'Relay decisions',robots:{index:false,follow:false}};
export default async function Page(){const user=await requireChatGPTUser('/moderation/relay');try{authorizeModerator(user.email,env.MODERATOR_EMAIL)}catch{return <main>Moderation access required</main>}return <RelayOperatorView/>}
