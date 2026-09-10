import {z} from 'zod';
export const utilitySchemas={
 'citation-audit':z.object({sources:z.array(z.string().trim().min(1).max(2000)).min(1).max(50)}).strict(),
 'validate-json':z.object({text:z.string().max(16000),format:z.boolean().optional()}).strict()
};
export const utilityContracts={
 'citation-audit':{type:'object',additionalProperties:false,required:['sources'],properties:{sources:{type:'array',minItems:1,maxItems:50,items:{type:'string',minLength:1,maxLength:2000}}}},
 'validate-json':{type:'object',additionalProperties:false,required:['text'],properties:{text:{type:'string',maxLength:16000},format:{type:'boolean'}}}
};
export function utility(name:string,input:unknown){
 if(name==='validate-json'){const {text,format}=utilitySchemas[name].parse(input);try{const parsed=JSON.parse(text);return {valid:true,top_level_type:parsed===null?'null':Array.isArray(parsed)?'array':typeof parsed,...(format?{formatted:JSON.stringify(parsed,null,2)}:{}),limitations:'JSON syntax only. Does not validate a schema, detect duplicate object keys, assess accuracy or execute content.'}}catch(e:any){return {valid:false,error:e.message,limitations:'JSON syntax only. No repair or execution attempted.'}}}
 if(name!=='citation-audit')throw new Error('Unknown utility');
 const {sources}=utilitySchemas[name].parse(input);
 const entries=sources.map((original,index)=>{let value=original.replace(/^doi:\s*/i,'');if(/^10\.\d{4,9}\/\S+$/i.test(value))return {index,original,key:'doi:'+value.toLowerCase(),normalized:'https://doi.org/'+value.toLowerCase(),method:'DOI identifier'};
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();const host=u.hostname.toLowerCase();if(host==='doi.org'||host==='dx.doi.org'){const doi=decodeURIComponent(u.pathname.slice(1));if(/^10\.\d{4,9}\/\S+$/i.test(doi))return {index,original,key:'doi:'+doi.toLowerCase(),normalized:'https://doi.org/'+doi.toLowerCase(),method:'DOI identifier'}}
 if(host==='arxiv.org'||host==='www.arxiv.org'){const paper=u.pathname.match(/^\/(?:abs|pdf)\/(.+?)(?:\.pdf)?$/)?.[1];if(paper&&/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i.test(paper))return {index,original,key:'arxiv:'+paper,normalized:'https://arxiv.org/abs/'+paper,method:'arXiv identifier; explicit versions kept distinct'}}
 u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||['gclid','fbclid','msclkid'].includes(key.toLowerCase()))u.searchParams.delete(key);return {index,original,key:'url:'+u.href,normalized:u.href,method:'URL minus fragment and known tracking parameters'}
 }catch{return {index,original,key:null,normalized:null,method:'Unrecognized input; provide HTTP(S) URL or DOI'}}});
 const groups=new Map<string,typeof entries>();for(const e of entries)if(e.key){const group=groups.get(e.key)||[];group.push(e);groups.set(e.key,group)}
 return {input_count:sources.length,recognized_count:entries.filter(e=>e.key).length,unique_document_candidates:groups.size,duplicate_groups:[...groups.values()].filter(g=>g.length>1).map(g=>({normalized:g[0].normalized,indices:g.map(e=>e.index),reason:g[0].method})),entries,limitations:'Deterministic identifier comparison only. No URLs are fetched. Different URLs can copy one source; matching identifiers do not prove the underlying claim true. Fragment removal groups the same document, not necessarily the same passage. Unversioned arXiv IDs are not assumed equal to a specific version.',next_step:'For substantive source independence, find source-verification agents at /api/v1/agents?capability=source-verification.'};
}
