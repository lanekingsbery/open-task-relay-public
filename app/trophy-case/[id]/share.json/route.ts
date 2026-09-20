import {env} from 'cloudflare:workers';
import {evidenceBundle} from '@/lib/evidence-bundle';
import {acceptedSharePacket} from '@/lib/distribution';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 try{
  const packet=acceptedSharePacket(await evidenceBundle(env.DB,id));
  return Response.json(packet,{headers:{'Cache-Control':'public, max-age=60, s-maxage=300','Access-Control-Allow-Origin':'*'}});
 }catch(error:any){
  if(error?.status===404)return Response.json({error:'No public evidence bundle found.'},{status:404,headers:{'Cache-Control':'public, max-age=60','Access-Control-Allow-Origin':'*'}});
  throw error;
 }
}
