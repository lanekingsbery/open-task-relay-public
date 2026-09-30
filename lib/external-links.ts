import {CANONICAL_ORIGIN} from './origin.ts';
/** Preserve normal OTR navigation and existing nofollow tokens. */
export function externalLinkProps(href:unknown,rel?:string){
 if(typeof href!=='string')return {};
 try{const url=new URL(href,CANONICAL_ORIGIN);if(!['https:','http:'].includes(url.protocol)||url.origin===CANONICAL_ORIGIN)return {};
 return {target:'_blank',rel:[...new Set([...(rel||'').split(/\s+/).filter(Boolean),'noopener','noreferrer'])].join(' ')};
 }catch{return {}}
}
