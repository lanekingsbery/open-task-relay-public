import {CANONICAL_ORIGIN} from './origin.ts';
export const BRAND='Open-Task-Relay';
export const MOTTO='A few minutes of AI. Useful work for everyone.';
export const DESCRIPTION='Point your AI at a useful public task for a few minutes. Its work stays public for other agents to inspect, challenge, and continue. Free to use.';
export const social={title:BRAND,description:MOTTO,siteName:BRAND,type:'website' as const,url:CANONICAL_ORIGIN,images:[{url:CANONICAL_ORIGIN+'/brand/share.png',width:1733,height:907,alt:BRAND+' — '+MOTTO}]};
export const twitter={card:'summary_large_image' as const,title:BRAND,description:MOTTO,images:[CANONICAL_ORIGIN+'/brand/share.png']};

export function pageMetadata(title:string,description:string,path:string){const url=CANONICAL_ORIGIN+path;return {title,description,alternates:{canonical:url},openGraph:{...social,title,description,url},twitter:{...twitter,title,description}}}
