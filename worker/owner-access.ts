export type OwnerEnv={RELAY_SELF_HOSTED?:string;CF_ACCESS_TEAM_DOMAIN?:string;CF_ACCESS_AUD?:string;MODERATOR_EMAIL?:string};
type AccessKey=JsonWebKey&{kid?:string};
let cached:{domain:string;until:number;keys:AccessKey[]}|undefined;
async function publicKeys(domain:string):Promise<AccessKey[]>{
 if(cached?.domain===domain&&cached.until>Date.now())return cached.keys;
 const r=await fetch(domain+'/cdn-cgi/access/certs',{redirect:'manual',signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw new Error('Access keys unavailable');
 const data=await r.json() as {keys:AccessKey[]};
 if(!Array.isArray(data.keys)||data.keys.length>32)throw new Error('Invalid Access keys');
 cached={domain,until:Date.now()+300000,keys:data.keys};return data.keys;
}
const decode=(value:string)=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function verifyOwner(token:string,env:OwnerEnv,keys=publicKeys):Promise<string|null>{
 try{
 const domain=env.CF_ACCESS_TEAM_DOMAIN,aud=env.CF_ACCESS_AUD,email=env.MODERATOR_EMAIL;
 if(!domain||!/^https:\/\/[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/.test(domain)||!aud||!email||token.length>16000)return null;
 const parts=token.split('.');if(parts.length!==3||parts.some(p=>!p||!/^[a-zA-Z0-9_-]+$/.test(p)))return null;
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
 const now=Date.now()/1000;
 if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.type!=='app'||claims.iss!==domain||!Array.isArray(claims.aud)||!claims.aud.includes(aud)||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now+30||(claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now+30))||typeof claims.email!=='string'||claims.email.toLowerCase()!==email.toLowerCase())return null;
 const jwk=(await keys(domain)).find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 if(!jwk)return null;
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return null;
 return email;
 }catch{return null}
}
export async function ownerRequest(request:Request,env:OwnerEnv):Promise<Request|Response>{
 if(env.RELAY_SELF_HOSTED!=='true')return request;
 const headers=new Headers(request.headers);
 for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
 const email=await verifyOwner(headers.get('cf-access-jwt-assertion')||'',env);
 if(email){headers.set('oai-authenticated-user-email',email);headers.set('oai-authenticated-user-id','cloudflare-access-owner');}
 let path=new URL(request.url).pathname;try{path=decodeURIComponent(path)}catch{}
 if((path==='/moderation'||path.startsWith('/moderation/')||path==='/moderation.rsc'||path==='/api/moderation'||path.startsWith('/api/moderation/')||path==='/api/missions'||path.startsWith('/api/missions/'))&&!email)return new Response('Owner sign-in required',{status:403,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
 if(['/signin-with-chatgpt','/signout-with-chatgpt','/callback'].includes(path))return new Response('This host uses Cloudflare Access for owner sign-in.',{status:403,headers:{'Cache-Control':'private, no-store'}});
 return new Request(request,{headers});
}
