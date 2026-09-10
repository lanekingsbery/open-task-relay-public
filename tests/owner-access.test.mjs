import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOwner,ownerRequest} from '../worker/owner-access.ts';
test('owner requires signed Access token, correct issuer/audience/email and valid times',async()=>{
 const env={RELAY_SELF_HOSTED:'true',CF_ACCESS_TEAM_DOMAIN:'https://fixture.cloudflareaccess.com',CF_ACCESS_AUD:'fixture-audience',MODERATOR_EMAIL:'owner@example.invalid'};
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'fixture',alg:'RS256'},keys=async()=>[jwk];
 const claims={type:'app',iss:env.CF_ACCESS_TEAM_DOMAIN,aud:[env.CF_ACCESS_AUD],email:env.MODERATOR_EMAIL,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600};
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const sign=async(c,alg='RS256')=>{const payload=encode({alg,kid:'fixture'})+'.'+encode(c);return payload+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(payload))).toString('base64url')};
 assert.equal(await verifyOwner(await sign(claims),env,keys),env.MODERATOR_EMAIL);
 const originalFetch=globalThis.fetch;
 try {
  globalThis.fetch=async(url,options)=>{
   assert.equal(url,env.CF_ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs');
   assert.equal(options.redirect,'manual');
   return Response.json({keys:[jwk]});
  };
  assert.equal(await verifyOwner(await sign(claims),env),env.MODERATOR_EMAIL);
  const otherEnv={...env,CF_ACCESS_TEAM_DOMAIN:'https://redirect-fixture.cloudflareaccess.com'};
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/keys'}});
  assert.equal(await verifyOwner(await sign({...claims,iss:otherEnv.CF_ACCESS_TEAM_DOMAIN}),otherEnv),null);
 } finally {globalThis.fetch=originalFetch;}
 for(const change of [{iss:'https://attacker.invalid'},{aud:['other']},{email:'other@example.invalid'},{exp:1},{iat:Date.now()/1000+3600},{nbf:Date.now()/1000+3600},{type:'org'}])assert.equal(await verifyOwner(await sign({...claims,...change}),env,keys),null);
 assert.equal(await verifyOwner(await sign(claims,'none'),env,keys),null);
 const token=await sign(claims);assert.equal(await verifyOwner(token.slice(0,-10)+'aaaaaaaaaa',env,keys),null);
 assert.equal(await verifyOwner(token,{...env,CF_ACCESS_AUD:undefined},keys),null);
 const spoof=new Request('https://opentaskrelay.org/api/moderation',{headers:{'oai-authenticated-user-email':env.MODERATOR_EMAIL}});
 assert.equal((await ownerRequest(spoof,env)).status,403);
 const publicRequest=await ownerRequest(new Request('https://opentaskrelay.org/api/tasks',{headers:{'oai-authenticated-user-email':env.MODERATOR_EMAIL}}),env);assert.equal(publicRequest.headers.get('oai-authenticated-user-email'),null);
});
