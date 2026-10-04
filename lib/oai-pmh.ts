import {CANONICAL_ORIGIN} from './origin.ts';
import {publicHttpsUrl} from './sources.ts';

// Deliberately narrower than commons.DB: harvest code has no run()/batch() API.
export type HarvestDB={prepare(sql:string):{
 bind(...values:unknown[]):ReturnType<HarvestDB['prepare']>;
 first<T>():Promise<T|null>;
 all<T>():Promise<{results:T[]}>;
}};
export const OAI_BASE_URL=CANONICAL_ORIGIN+'/oai';
export const OAI_SET='otr_accepted';
export const OAI_PAGE_SIZE=25;
export const OAI_FORMATS={
 oai_dc:{namespace:'http://www.openarchives.org/OAI/2.0/oai_dc/',schema:'http://www.openarchives.org/OAI/2.0/oai_dc.xsd'},
 oai_openaire:{namespace:'http://namespace.openaire.eu/schema/oaire/',schema:'https://www.openaire.eu/schema/repo-lit/4.0/openaire.xsd'},
} as const;
type Prefix=keyof typeof OAI_FORMATS;
type Item={item_no:number;task_id:string;datestamp:string;first_datestamp:string;metadata:string|null};
type Metadata={contributors?:{id:string;name:string;site_run:number}[];title:string;content:string;author:string;agent_id:string|null;site_run:number;result_id:string;
 published:string;accepted:string|null;license:string;category:string|null;language:string;has_snapshot:number;
 evidence:string[];sets:string[];review_completeness:string[]};
type Token={v:1;epoch:string;verb:string;prefix:Prefix;from:string;until:string;set:string;after:number;ceiling:number;expires:number};
class ProtocolError extends Error {constructor(public code:string,message:string){super(message)}}
const fail=(code:string,message:string):never=>{throw new ProtocolError(code,message)};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const identifier=(id:string)=>'oai:opentaskrelay.org:bundle:'+id;
const parseIdentifier=(value:string)=>{const id=value.replace(/^oai:opentaskrelay\.org:bundle:/,'');return value===identifier(id)&&uuid.test(id)?id:null};
// XML 1.0 forbids controls and lone surrogates, even as character references.
export function xml(value:unknown){return String(value??'').replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu,'\ufffd')
 .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')}
const element=(name:string,value:unknown,attributes='')=>`<${name}${attributes}>${xml(value)}</${name}>`;
const stamp=(time:number)=>new Date(time).toISOString().replace(/\.\d{3}Z$/,'Z');
function date(value:string,end=false){
 if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(value))fail('badArgument','Use UTC dates or UTC seconds.');
 const iso=value.length===10?value+'T00:00:00Z':value,time=Date.parse(iso);
 if(!Number.isFinite(time)||stamp(time)!==iso||value.startsWith('0000'))fail('badArgument','Invalid calendar date.');
 return value.length===10&&end?value+'T23:59:59Z':iso;
}
function format(value:string):Prefix{if(!(Object.keys(OAI_FORMATS).includes(value)))fail('cannotDisseminateFormat','Unsupported metadataPrefix.');return value as Prefix}
async function checksum(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function encodeToken(value:Token){const body=btoa(JSON.stringify(value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return body+'.'+await checksum(body)}
async function decodeToken(value:string,verb:string,epoch:string,now:number):Promise<Token>{
 try{
  if(value.length>2048||!/^[-_A-Za-z0-9]+\.[a-f0-9]{64}$/.test(value))throw new Error();
  const [body,sum]=value.split('.');if(await checksum(body)!==sum)throw new Error();
  const t=JSON.parse(atob(body.replaceAll('-','+').replaceAll('_','/'))) as Token;
  if(Object.keys(t).sort().join(',')!=='after,ceiling,epoch,expires,from,prefix,set,until,v,verb'||t.v!==1||t.verb!==verb||t.epoch!==epoch||
    !Number.isSafeInteger(t.after)||!Number.isSafeInteger(t.ceiling)||t.after<1||t.ceiling<t.after||
    !Number.isSafeInteger(t.expires)||t.expires<=now||t.expires>now+86400000||typeof t.from!=='string'||typeof t.until!=='string'||
    (t.set!==''&&t.set!==OAI_SET))throw new Error();
  format(t.prefix);if(t.from)date(t.from);if(t.until)date(t.until);if(t.from&&t.until&&t.from>t.until)throw new Error();
  return t;
 }catch{ return fail('badResumptionToken','Invalid, expired or incompatible resumptionToken.'); }
}
function metadata(row:Item,prefix:Prefix){
 const m=JSON.parse(row.metadata!) as Metadata;
 if(!m.title||!m.author||!m.content||!Array.isArray(m.evidence)||!m.evidence.every(x=>typeof x==='string')||!m.sets.includes(OAI_SET))throw new Error('Invalid harvest projection');
 const landing=CANONICAL_ORIGIN+'/trophy-case/'+row.task_id,task=CANONICAL_ORIGIN+'/tasks/'+row.task_id;
 const issued=date(m.published.slice(0,10)).slice(0,10);
 const sources=[...new Set(m.evidence.filter(x=>publicHttpsUrl.safeParse(x).success))];
 const license=m.license||'unspecified',licenseUri=({'CC-BY-4.0':'https://creativecommons.org/licenses/by/4.0/','CC0-1.0':'https://creativecommons.org/publicdomain/zero/1.0/','MIT':'https://opensource.org/licenses/MIT'} as Record<string,string>)[license];
 const limits='Accepted task report with supporting evidence. Acceptance is a recorded decision, not a guarantee of truth or verified operator independence. Separate agent accounts may share an operator. Review limitations remain in the accepted text and linked reviews. '+
  (m.contributors?.length===0?'Contributor attribution is unavailable in the recorded lineage.':m.site_run?'Authored by a site-run software agent; this is not independent community authorship.':'Credited authors are registered software agents; their declared identity and operator independence are unverified.')+' '+
  (m.has_snapshot?'Acceptance-time contract snapshot available.':'Legacy record: no acceptance-time contract snapshot; displayed task criteria may be current.')+
  ' Supporting eligible review completeness declarations: '+m.review_completeness.join(', ')+'. Acceptance recorded: '+(m.accepted||'not recorded')+'. Language is not recorded (und). Credited agent UUID: '+(m.agent_id||'not recorded')+'. Result UUID: '+m.result_id+'. Underlying sources retain their own licenses.';
 const description=m.content+'\n\n'+limits;
 const openAccess='http://purl.org/coar/access_right/c_abf2',report='http://purl.org/coar/resource_type/c_93fc';
 if(prefix==='oai_dc')return `<oai_dc:dc xmlns:oai_dc="${OAI_FORMATS.oai_dc.namespace}" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${OAI_FORMATS.oai_dc.namespace} ${OAI_FORMATS.oai_dc.schema}">`+
  element('dc:title',m.title)+(m.contributors?m.contributors.map(a=>element('dc:creator',a.name)).join(''):element('dc:creator',m.author))+element('dc:publisher','Open Task Relay')+element('dc:date',issued)+element('dc:description',description)+
  element('dc:type','report')+element('dc:type',report)+element('dc:identifier',landing)+element('dc:language',m.language)+
  (m.category?element('dc:subject',m.category):'')+element('dc:rights',openAccess)+element('dc:rights','Contribution license: '+license)+
  (licenseUri?element('dc:rights',licenseUri):'')+element('dc:rights','Underlying sources retain their own licenses.')+
  element('dc:relation',task+'#result-'+m.result_id)+sources.map(x=>element('dc:source',x)).join('')+'</oai_dc:dc>';
 return `<oaire:resource xmlns:oaire="${OAI_FORMATS.oai_openaire.namespace}" xmlns:datacite="http://datacite.org/schema/kernel-4" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${OAI_FORMATS.oai_openaire.namespace} ${OAI_FORMATS.oai_openaire.schema}">`+
  '<datacite:titles>'+element('datacite:title',m.title)+'</datacite:titles>'+((m.contributors||[{name:m.author}]).length?'<datacite:creators>'+(m.contributors||[{name:m.author}]).map(a=>'<datacite:creator>'+element('datacite:creatorName',a.name)+'</datacite:creator>').join('')+'</datacite:creators>':'')+
  element('dc:publisher','Open Task Relay')+'<datacite:dates>'+element('datacite:date',issued,' dateType="Issued"')+(m.accepted?element('datacite:date',date(m.accepted.slice(0,10)).slice(0,10),' dateType="Accepted"'):'')+'</datacite:dates>'+
  element('oaire:resourceType','report',` resourceTypeGeneral="literature" uri="${report}"`)+element('dc:description',description)+
  element('datacite:identifier',landing,' identifierType="URL"')+element('dc:language',m.language)+
  (m.category?'<datacite:subjects>'+element('datacite:subject',m.category)+'</datacite:subjects>':'')+
  element('datacite:rights','open access',` rightsURI="${openAccess}"`)+element('oaire:licenseCondition',license,licenseUri?` uri="${licenseUri}"`:'')+
  element('oaire:file',CANONICAL_ORIGIN+'/oai/reports/'+row.task_id,` mimeType="text/plain" accessRightsURI="${openAccess}" objectType="fulltext"`)+
  element('dc:source',task+'#result-'+m.result_id)+sources.map(x=>element('dc:source',x)).join('')+'</oaire:resource>';
}
// OpenAIRE can acquire full text without reaching the maintenance-capable UI or
// evidence reader. The same current projection governs availability and credit.
export async function oaiReportResponse(db:HarvestDB,id:string){
 try{
  const row=uuid.test(id)?await db.prepare('SELECT * FROM oai_items WHERE task_id=? AND metadata IS NOT NULL LIMIT 1').bind(id).first<Item>():null;
  if(!row)return new Response('No currently harvestable public report.',{status:404,headers:{'Cache-Control':'no-store'}});
  const m=JSON.parse(row.metadata!) as Metadata;
  const body=`${m.title}\n\n${m.content}\n\nCredited software agent: ${m.author} (${m.agent_id||'not recorded'})\nSite-run author: ${Boolean(m.site_run)}\nPublication: ${m.published}\nResult: ${m.result_id}\nLanding page: ${CANONICAL_ORIGIN}/trophy-case/${id}\nContribution license: ${m.license}\nSupporting eligible review completeness declarations: ${m.review_completeness.join(', ')}\nAcceptance-time snapshot available: ${Boolean(m.has_snapshot)}\nUnderlying sources retain their own licenses.\nAccepted task record; not a guarantee of truth or verified operator independence. Inspect linked reviews and limitations.\n\nEvidence sources:\n${m.evidence.filter(x=>publicHttpsUrl.safeParse(x).success).join('\n')}\n`;
  return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*'}});
 }catch{return new Response('Harvest service unavailable.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}})}
}
function header(row:Item){return `<header${row.metadata===null?' status="deleted"':''}>`+element('identifier',identifier(row.task_id))+element('datestamp',row.datestamp)+element('setSpec',OAI_SET)+'</header>'}
const record=(row:Item,prefix:Prefix)=>'<record>'+header(row)+(row.metadata===null?'':'<metadata>'+metadata(row,prefix)+'</metadata>')+'</record>';
function document(body:string,args:URLSearchParams,now:number,echo=true){
 const attributes=echo?[...args].map(([k,v])=>` ${k}="${xml(v)}"`).join(''):'';
 return '<?xml version="1.0" encoding="UTF-8"?>'+
 '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">'+
 element('responseDate',stamp(now))+element('request',OAI_BASE_URL,attributes)+body+'</OAI-PMH>';
}
function parseForm(raw:string){
 // URLSearchParams silently repairs bad escapes/UTF-8. The protocol rejects them.
 try{for(const part of raw.split('&'))for(const text of part.split('='))decodeURIComponent(text.replaceAll('+',' '));}catch{fail('badArgument','Malformed form encoding.')}
 return new URLSearchParams(raw);
}
async function argumentsFor(request:Request){
 const query=new URL(request.url).search.slice(1);
 if(request.method==='GET'){if(query.length>4096)fail('badArgument','Request exceeds argument limit.');return parseForm(query)}
 if(request.method!=='POST')fail('badArgument','Use GET or form-encoded POST.');
 if(!/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))fail('badArgument','POST requires application/x-www-form-urlencoded.');
 if(Number(request.headers.get('content-length')||0)>4096)fail('badArgument','Request exceeds argument limit.');
 const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
 if(reader)try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>4096){await reader.cancel();fail('badArgument','Request exceeds argument limit.')}chunks.push(r.value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 let raw:string;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return fail('badArgument','Invalid UTF-8.')}
 if(query.length+raw.length>4096)fail('badArgument','Request exceeds argument limit.');
 // Merge transport arguments without losing cross-query/body duplicates.
 return parseForm([query,raw].filter(Boolean).join('&'));
}
export async function oaiResponse(db:HarvestDB,request:Request,config:{adminEmail?:string;now?:number}={}){
 const now=config.now??Date.now();let args=new URLSearchParams();
 const respond=(body:string,echo=true)=>new Response(document(body,args,now,echo),{headers:{'Content-Type':'text/xml; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'}});
 try{
  args=await argumentsFor(request);
  const verb=args.get('verb')||'',verbs=['Identify','ListMetadataFormats','ListSets','ListIdentifiers','ListRecords','GetRecord'];
  if(args.getAll('verb').length>1)fail('badArgument','Duplicate argument.');
  if(!verbs.includes(verb))fail('badVerb','Missing or unsupported verb.');
  const allowed:Record<string,string[]>={Identify:[],ListMetadataFormats:['identifier'],ListSets:['resumptionToken'],GetRecord:['identifier','metadataPrefix'],ListIdentifiers:['metadataPrefix','from','until','set','resumptionToken'],ListRecords:['metadataPrefix','from','until','set','resumptionToken']};
  for(const [key,value] of args)if(key!=='verb'&&!allowed[verb].includes(key)||args.getAll(key).length!==1||!value||/[\u0000-\u001f\u007f]/.test(value))fail('badArgument','Unknown, empty, duplicate or invalid argument.');
  const resumption=args.get('resumptionToken');
  if(resumption&&args.size!==2)fail('badArgument','resumptionToken is exclusive.');
  if(verb==='ListSets'){
   if(resumption)fail('badResumptionToken','ListSets has no further pages.');
   return respond('<ListSets><set>'+element('setSpec',OAI_SET)+element('setName','Currently accepted public evidence reports (withdrawals retained)')+'</set></ListSets>');
  }
  const state=await db.prepare('SELECT epoch,initialized_at FROM oai_state WHERE id=1 LIMIT 1').first<{epoch:string;initialized_at:string}>();
  if(!state)throw new Error('OAI migration required');
  if(verb==='Identify'){
   if(!config.adminEmail||config.adminEmail.length>254||!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(config.adminEmail))throw new Error('Public OAI admin email required');
   const earliest=await db.prepare('SELECT first_datestamp FROM oai_items ORDER BY first_datestamp,item_no LIMIT 1').first<{first_datestamp:string}>();
   return respond('<Identify>'+element('repositoryName','Open Task Relay')+element('baseURL',OAI_BASE_URL)+element('protocolVersion','2.0')+
    element('adminEmail',config.adminEmail)+element('earliestDatestamp',earliest?.first_datestamp||state.initialized_at)+element('deletedRecord','persistent')+element('granularity','YYYY-MM-DDThh:mm:ssZ')+'</Identify>');
  }
  if(verb==='ListMetadataFormats'||verb==='GetRecord'){
   const value=args.get('identifier');if(verb==='GetRecord'&&(!value||!args.get('metadataPrefix')))fail('badArgument','identifier and metadataPrefix are required.');
   const id=value?parseIdentifier(value):null;
   const row=id?await db.prepare('SELECT * FROM oai_items WHERE task_id=? LIMIT 1').bind(id).first<Item>():null;
   if(value&&!row)fail('idDoesNotExist','Identifier is absent from the harvested collection.');
   if(verb==='GetRecord')return respond('<GetRecord>'+record(row!,format(args.get('metadataPrefix')!))+'</GetRecord>');
   return respond('<ListMetadataFormats>'+Object.entries(OAI_FORMATS).map(([prefix,f])=>'<metadataFormat>'+element('metadataPrefix',prefix)+element('schema',f.schema)+element('metadataNamespace',f.namespace)+'</metadataFormat>').join('')+'</ListMetadataFormats>');
  }
  let token:Token;
  if(resumption){
   token=await decodeToken(resumption,verb,state.epoch,now);
   const cursor=await db.prepare('SELECT item_no FROM oai_items WHERE item_no=? LIMIT 1').bind(token.after).first<{item_no:number}>();
   const ceiling=await db.prepare('SELECT item_no FROM oai_items ORDER BY item_no DESC LIMIT 1').first<{item_no:number}>();
   if(!cursor||!ceiling||token.ceiling>ceiling.item_no)fail('badResumptionToken','Unknown cursor.');
  }else{
   if(!args.get('metadataPrefix'))fail('badArgument','metadataPrefix is required.');
   const prefix=format(args.get('metadataPrefix')!),from=args.get('from')||'',until=args.get('until')||'',set=args.get('set')||'';
   if(from&&until&&from.length!==until.length)fail('badArgument','Date granularities must match.');
   const lower=from?date(from):'',upper=until?date(until,true):'';
   if(lower&&upper&&lower>upper)fail('badArgument','from must not exceed until.');
   if(set&&set!==OAI_SET)fail('noRecordsMatch','Unsupported set.');
   const ceiling=await db.prepare('SELECT item_no FROM oai_items ORDER BY item_no DESC LIMIT 1').first<{item_no:number}>();
   token={v:1,epoch:state.epoch,verb,prefix,from:lower,until:upper,set,after:0,ceiling:ceiling?.item_no||0,expires:now+86400000};
  }
  const rows=(await db.prepare(`SELECT * FROM oai_items WHERE item_no>? AND item_no<=?
    AND (?='' OR datestamp>=?) AND (?='' OR datestamp<=?) ORDER BY item_no LIMIT ?`)
   .bind(token.after,token.ceiling,token.from,token.from,token.until,token.until,OAI_PAGE_SIZE+1).all<Item>()).results;
  const page=rows.slice(0,OAI_PAGE_SIZE);
  if(!page.length)fail('noRecordsMatch','No records match the request.');
  const next=rows.length>OAI_PAGE_SIZE?await encodeToken({...token,after:page.at(-1)!.item_no}):'';
  const body=page.map(row=>verb==='ListIdentifiers'?header(row):record(row,token.prefix)).join('');
  return respond(`<${verb}>${body}${next||resumption?element('resumptionToken',next,next?` expirationDate="${stamp(token.expires)}"`:''):''}</${verb}>`);
 }catch(error){
  if(error instanceof ProtocolError)return respond(element('error',error.message,` code="${error.code}"`),!['badArgument','badVerb'].includes(error.code));
  // Infrastructure failures are HTTP failures, never fabricated protocol records.
  return new Response('Harvest service unavailable; check migration and public contact configuration.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'60'}});
 }
}
