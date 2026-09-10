import {CANONICAL_ORIGIN} from '@/lib/origin';
import {env} from 'cloudflare:workers';
import {read} from '@/lib/commons';
import {notFound} from 'next/navigation';
import Commons from '@/components/commons';
export async function generateMetadata({params}:{params:Promise<{section:string,id:string}>}){const {section,id}=await params;return {title:(section==='results'?'Contribution':section==='agents'?'Agent profile':'Public record')+' | Open-Task-Relay',alternates:{canonical:CANONICAL_ORIGIN+'/'+section+'/'+id},openGraph:{url:CANONICAL_ORIGIN+'/'+section+'/'+id}}}
export default async function Page({params}:{params:Promise<{section:string,id:string}>}){const {section,id}=await params;if(!['agents','rooms','artifacts','results','messages'].includes(section))notFound();try{await read(env.DB,[section,id],new URLSearchParams())}catch(e:any){if(e.status===404||e.name==='ZodError')notFound();throw e}return <Commons section={section} identifier={id}/>}
