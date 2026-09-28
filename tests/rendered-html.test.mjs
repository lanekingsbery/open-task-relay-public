import {createTaskFixture} from './task-fixture.mjs';
import {HOME_BADGES,SOURCE_BADGES,OPENAIRE_RECORD,SOFTWARE_HERITAGE_RECORD,SOFTWARE_HERITAGE_BADGE} from '../lib/project-links.ts';
import {MIT_LICENSE_TEXT} from '../lib/license.ts';
import {hideComment} from '../lib/guest-board.ts';
import {humanCopy} from '../lib/human-copy.ts';
import {matchRelayReleaseTasks} from './relay-fixture.mjs';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('built Worker routes and real D1 HTTP workflow',async()=>{
const mf=new Miniflare(convertV4MiniflareOptions({modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),modulesRoot:'dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{MODERATOR_EMAIL:'moderator@example.invalid'},serviceBindings:{ASSETS:async(request)=>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/__relay_assets/')||path.includes('..')||!existsSync('dist/client'+path))return new Response('Not found',{status:404});
 const bytes=readFileSync('dist/client'+path),etag='"'+createHash('sha256').update(bytes).digest('hex')+'"';
 const headers={'ETag':etag,'Cache-Control':'public, max-age=0, must-revalidate','Content-Type':path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream'};
 return new Response(request.method==='HEAD'||request.headers.get('if-none-match')===etag?null:bytes,{status:request.headers.get('if-none-match')===etag?304:200,headers});
}}}));
try{const db=await mf.getD1Database('DB');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){const sql=readFileSync('drizzle/'+f,'utf8');for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run()}
assert.equal(existsSync('dist/client/_headers'),false,'Header rules cannot be uploaded as an ordinary asset');
assert.equal(existsSync('dist/client/brand/relay-mark-160.59869f96598d.webp'),false,'Public asset URLs must pass through the header handler');
for(const path of ['/brand/relay-mark-160.59869f96598d.webp','/_next/static/css/'+readdirSync('dist/client/__relay_assets/_next/static/css').find(f=>f.endsWith('.css'))]){
 const asset=await mf.dispatchFetch('https://opentaskrelay.org'+path);assert.equal(asset.status,200);assert.equal(asset.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.ok((await asset.arrayBuffer()).byteLength);
 const validated=await mf.dispatchFetch('https://opentaskrelay.org'+path,{headers:{'If-None-Match':asset.headers.get('etag')}});assert.equal(validated.status,304);assert.equal(await validated.text(),'');assert.equal(validated.headers.get('cache-control'),'public, max-age=31536000, immutable');
 const head=await mf.dispatchFetch('https://opentaskrelay.org'+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('cache-control'),'public, max-age=31536000, immutable');
}
const artwork=await mf.dispatchFetch('https://opentaskrelay.org/brand/relay-signoff.webp');assert.equal(artwork.headers.get('cache-control'),'public, max-age=86400, must-revalidate');
const headerFile=await mf.dispatchFetch('https://opentaskrelay.org/_headers');assert.equal(headerFile.status,404);assert.equal(await headerFile.text(),'');
for(const suffix of ['/problems','/problems/?sort=review']){const r=await mf.dispatchFetch('https://opentaskrelay.org'+suffix,{redirect:'manual'});assert.equal(r.status,301);assert.equal(r.headers.get('location'),'https://opentaskrelay.org/tasks'+(suffix.includes('?')?'?sort=review':''));}
const agentPage=await mf.dispatchFetch('https://opentaskrelay.org/agent-guide');const agentHtml=await agentPage.text();assert.match(agentPage.headers.get('cache-control'),/s-maxage=3600/);assert.equal(agentPage.status,200);assert.match(agentHtml,/<link rel="canonical" href="https:\/\/opentaskrelay.org\/agent-guide"/);assert.match(agentHtml,/<meta property="og:url" content="https:\/\/opentaskrelay.org\/agent-guide"/);assert.ok(agentHtml.includes('"@type":"WebPage","name":"For Agents","url":"https://opentaskrelay.org/agent-guide"'));assert.ok(agentHtml.includes('id="review-work"'));assert.ok(agentHtml.includes('id="network-access"'));
for(const headers of [{Cookie:'session=fixture'},{Authorization:'Bearer fixture'},{RSC:'1'}]){
 const variant=await mf.dispatchFetch('https://opentaskrelay.org/agent-guide',{headers,redirect:'manual'});
 assert.equal(variant.headers.get('x-relay-page-cache'),null,'Private/framework variants must bypass the HTML cache');
}
for(const path of ['/tasks.rsc','/activity.rsc','/submit.rsc']){const r=await mf.dispatchFetch('https://opentaskrelay.org'+path);await r.text();assert.match(r.headers.get('cache-control'),/no-store/);}
const refresh=await mf.dispatchFetch('https://opentaskrelay.org/activity',{headers:{'Cache-Control':'no-cache'}});await refresh.text();assert.equal(refresh.headers.get('x-relay-data-cache'),'refreshed');assert.equal(refresh.headers.get('cache-control'),'no-store');
for(const path of ['/egress.json','/api/reviews','/api/health']){const r=await mf.dispatchFetch('https://opentaskrelay.org'+path);assert.equal(r.status,200);assert.ok((await r.json()).data);}
const relocated=await mf.dispatchFetch('https://agent-commons.lanekingsbery.chatgpt.site/tasks?status=open',{redirect:'manual'});assert.equal(relocated.status,301);assert.equal(relocated.headers.get('location'),'https://opentaskrelay.org/tasks?status=open');
const noCredentialRedirect=await mf.dispatchFetch('https://agent-commons.lanekingsbery.chatgpt.site/api/v1/rooms',{method:'POST',headers:{Authorization:'Bearer invalid','Content-Type':'application/json'},body:'{}',redirect:'manual'});assert.equal(noCredentialRedirect.status,421);assert.equal(noCredentialRedirect.headers.get('location'),null);
const ownerMission=async(query='')=>{const response=await mf.dispatchFetch('https://commons.test/api/missions'+query,{method:'POST',headers:{Origin:'https://commons.test','oai-authenticated-user-email':'moderator@example.invalid'}});assert.equal(response.status,200,await response.clone().text());return response};
const call=async(path,method='GET',body,token,expected=200)=>{const r=await mf.dispatchFetch('https://commons.test'+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});assert.equal(r.status,expected,await r.clone().text());return r};
const triggerCounts=async()=>JSON.stringify(await Promise.all(['tasks','results','verifications','artifacts','guest_submissions','events','agents','rooms','limits'].map(async table=>(await db.prepare('SELECT count(*) n FROM '+table).first()).n)));
const triggerBefore=await triggerCounts();
for(const query of ['', '?daily=1','?relay=1','?daily=1&relay=1'])for(const [email,origin] of [[null,'https://commons.test'],['other@example.invalid','https://commons.test'],['moderator@example.invalid','https://foreign.invalid'],['moderator@example.invalid',null]]){
 const response=await mf.dispatchFetch('https://commons.test/api/missions'+query,{method:'POST',headers:{...(email?{'oai-authenticated-user-email':email}:{}),...(origin?{Origin:origin}:{})}});assert.equal(response.status,403);
}
await call('/api/demo','POST',{},undefined,410);assert.equal(await triggerCounts(),triggerBefore);
for(const route of ['/','/activity','/agents','/rooms','/tasks','/artifacts','/docs','/about','/connect','/adoption','/tools','/tools/citation-audit','/tools/validate-json','/source','/contact','/security','/submit','/privacy','/results','/messages','/my-problems']){const r=await call(route);const html=await r.text();assert.match(html,/Open-Task-Relay/);assert.doesNotMatch(html,/>Agent Commons</)}
const response=await mf.dispatchFetch('https://opentaskrelay.org/agents.json');const manifest=await response.json();assert.equal(manifest.canonical_url,'https://opentaskrelay.org');assert.equal(manifest.tasks,'https://opentaskrelay.org/api/tasks');assert.equal(manifest.relay_leg.max_minutes,5);
const guide=await (await mf.dispatchFetch('https://opentaskrelay.org/skill.md')).text();assert.ok(guide.includes(manifest.task_summaries));assert.match(manifest.task_summaries,/view=summary/);
assert.match(agentHtml,/Find a task\. Do one useful thing\. Submit, done\./);
assert.match(agentHtml,/chat-only agent or a quick manual trial/);
assert.match(agentHtml,/30 seconds to 5 minutes/);
assert.match(agentHtml,/What I checked/);assert.match(agentHtml,/Next useful check/);
for(const legacy of ['https://opentaskrelay.com','https://www.opentaskrelay.org']){const page=await mf.dispatchFetch(legacy+'/tasks?sort=review',{redirect:'manual'});assert.equal(page.status,301);assert.equal(page.headers.get('location'),'https://opentaskrelay.org/tasks?sort=review')}
await call('/api/tasks','HEAD');
for(const ua of ['Python-urllib/3.12','curl/8.10.1','python-requests/2.34.2','node','OpenTaskRelay-Python/1.1'])for(const path of ['/skill.md','/agents.json','/openapi.json','/api/tasks','/api/solved']){
 const read=await mf.dispatchFetch('https://opentaskrelay.org'+path,{headers:{'User-Agent':ua,'CF-Connecting-IP':'192.0.2.'+(10+ua.length)}});assert.equal(read.status,200);assert.equal(read.headers.get('access-control-allow-origin'),'*');assert.ok(read.headers.get('link'));
 assert.equal(read.headers.get('cache-control'),path.startsWith('/api/')?'no-store':'public, max-age=300');
 const head=await mf.dispatchFetch('https://opentaskrelay.org'+path,{method:'HEAD',headers:{'User-Agent':ua,'CF-Connecting-IP':'192.0.2.'+(10+ua.length)}});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.ok(head.headers.get('content-type'));
}
for(const path of ['/skill.md','/agents.json','/openapi.json']){
 const options=await mf.dispatchFetch('https://opentaskrelay.org'+path,{method:'OPTIONS'});assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-methods'),'GET, HEAD, OPTIONS');
 const withAuth=await mf.dispatchFetch('https://opentaskrelay.org'+path,{headers:{Authorization:'Bearer local-fixture-only'}});assert.equal(withAuth.headers.get('cache-control'),'private, no-store');
}
await call('/api/tasks','POST',{title:'Unauthenticated fixture',description:'Must never create a task'},undefined,410);

for(const route of ['/.well-known/agent-card.json','/agents.json','/openapi.json','/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt','/skill.md','/agent-guide','/api/tasks'])await call(route);
await call('/does-not-exist','GET',undefined,undefined,404);await call('/tasks/not-a-uuid','GET',undefined,undefined,404);
await call('/api/moderation','GET',undefined,undefined,403);await call('/api/moderation','POST',{task_id:'00000000-0000-4000-8000-000000000001',decision:'approved',reason:'Unauthorized review attempt'},undefined,403);
const submitHtml=await (await call('/submit')).text();assert.match(submitHtml,/Public task submission has retired/);assert.match(submitHtml,/<meta name="robots" content="noindex/);assert.doesNotMatch(submitHtml,/<form/);assert.doesNotMatch(submitHtml,/Sign in with ChatGPT|Coming soon/);
assert.match(await (await call('/my-problems')).text(),/bookmark is your follow button/);
assert.equal((await (await call('/api/problems')).json()).data.task_creation_enabled,false);
await call('/api/problems','POST',{},undefined,410);
const initialized=await call('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'integration-test',version:'1'}}});assert.equal((await initialized.json()).result.protocolVersion,'2025-11-25');
const filtered=await call('/agents?capability=source-verification');assert.match(await filtered.text(),/value="source-verification"/);
const utilityResponse=await call('/api/v1/utilities/citation-audit','POST',{sources:['doi:10.1000/abc','https://doi.org/10.1000/abc']});assert.equal((await utilityResponse.json()).data.duplicate_groups.length,1);
assert.equal((await (await call('/api/v1/utilities/validate-json','POST',{text:'{}'})).json()).data.valid,true);
const home=await call('/');const homeHtml=await home.clone().text();assert.match(homeHtml,/Useful work for idle intelligence\./);assert.match(homeHtml,/property="og:title" content="Open-Task-Relay"/);assert.match(homeHtml,/brand\/share.png/);assert.equal((homeHtml.match(/<header/g)||[]).length,1);assert.ok(home.headers.get('strict-transport-security'));assert.ok(home.headers.get('content-security-policy'));assert.doesNotMatch(homeHtml,/<meta[^>]+(?:noindex|nofollow)/);assert.match(homeHtml,/<link rel="canonical" href="https:\/\/opentaskrelay.org"/);
// Exercise the shipped pre-paint script with both OS preferences and saved overrides.
const themeScript=[...homeHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(script=>script.includes('localStorage')&&script.includes('matchMedia'));
assert.ok(themeScript);assert.match(homeHtml,/aria-label="Toggle light or dark theme"/);
assert.ok(homeHtml.indexOf(themeScript)<homeHtml.indexOf('<header'));
for(const systemDark of [false,true])for(const saved of [null,'light','dark']){
 const classes=new Set(),style={};
 runInNewContext(themeScript,{
  document:{documentElement:{classList:{remove:(...names)=>names.forEach(name=>classes.delete(name)),add:name=>classes.add(name)},style}},
  window:{matchMedia:()=>({matches:systemDark})},localStorage:{getItem:()=>saved}
 });
 const expected=saved??(systemDark?'dark':'light');assert.deepEqual([...classes],[expected]);assert.equal(style.colorScheme,expected);
}

// Branding is presentation-only; homepage identity links remain deliberately limited.
assert.match(homeHtml,/class="wordmark-version">v1\.8<\/span>/);
assert.doesNotMatch(homeHtml,/<a[^>]+href="https:\/\/orcid.org\//);
assert.doesNotMatch(homeHtml,/Lane Kingsbery|Kingsbery, L\./);
assert.doesNotMatch(homeHtml,/The first trophy|Trophy Case|href="\/trophy-case|flow-visual/);
assert.doesNotMatch(homeHtml,/href="\/about#public-beta"/);
assert.doesNotMatch(homeHtml,/relay-step-number|relay-flow|send-section|home-tasks-title/);
assert.equal(MIT_LICENSE_TEXT.replaceAll('\r\n','\n'),readFileSync('LICENSE','utf8').replaceAll('\r\n','\n'));
const trustStrip=homeHtml.match(/<ul id="project-records"[\s\S]*?<\/ul>/)?.[0];
assert.ok(trustStrip);
assert.deepEqual(HOME_BADGES.map(badge=>badge.name),['A2A','Glama','FastDrop','Source checks','MIT License']);
assert.equal((trustStrip.match(/<a /g)||[]).length,5);
assert.deepEqual(SOURCE_BADGES.find(badge=>badge.name==='Software Heritage'),{name:'Software Heritage',href:SOFTWARE_HERITAGE_RECORD,src:SOFTWARE_HERITAGE_BADGE});
const swhBadge=await call(SOFTWARE_HERITAGE_BADGE);
assert.match(swhBadge.headers.get('content-type'),/image\/svg\+xml/);
assert.equal(swhBadge.headers.get('cache-control'),'public, max-age=31536000, immutable');
const swhBytes=Buffer.from(await swhBadge.arrayBuffer());
assert.equal(createHash('sha256').update(swhBytes).digest('hex'),'0609cf75d97f2275edf70d993a7e531ffcb155241f85d5da00c515bbbb3e26bc','Badge must remain byte-for-byte provider artwork');
assert.ok(swhBytes.toString().includes(SOFTWARE_HERITAGE_RECORD.split('/').at(3).split(';')[0]));
assert.doesNotMatch(swhBytes.toString(),/<script|foreignObject|\bon\w+=/i);
for(const badge of HOME_BADGES){assert.ok(trustStrip.includes('href="'+badge.href+'"'));assert.ok(trustStrip.includes('src="'+badge.src.replaceAll('&','&amp;')+'"'));assert.ok(trustStrip.includes('alt="'+('alt' in badge?badge.alt:badge.name)+'"'));}
assert.doesNotMatch(trustStrip,/Smithery|Software Heritage|DOI|OpenAIRE|fastdrop.dev\/u\//);
const smitheryBadge=await call('/brand/smithery-listed.svg');
assert.match(smitheryBadge.headers.get('content-type'),/image\/svg\+xml/);
assert.match(await smitheryBadge.text(),/Smithery/);
assert.doesNotMatch(homeHtml,/Swarm Demo|swarm-demo|registered accounts|Community agents:/);
const primaryNav=homeHtml.match(/<nav aria-label="Main navigation">[\s\S]*?<\/nav>/)?.[0];
for(const label of ['Tasks','Activity','Solved','For Agents'])assert.ok(primaryNav?.includes(label));
assert.doesNotMatch(primaryNav,/Problems/);
assert.equal((primaryNav.match(/<a /g)||[]).length,4);
assert.doesNotMatch(homeHtml,/Citable|record-badge-label|Zenodo certified|copyright registered/i);
const homeFooter=homeHtml.match(/<footer class="home-footer">[\s\S]*?<\/footer>/)?.[0];
assert.ok(homeFooter);
assert.match(homeFooter,/© 2026 Open Task Relay/);
assert.match(homeFooter,/<a[^>]+href="\/contributor-badges"[^>]*>Contributor badges<\/a>/);
assert.doesNotMatch(homeFooter,/<img|<details|For Agents|Request a task|Public beta|MIT License|Zenodo|GitHub|footer-domain/);
assert.doesNotMatch(homeHtml,/Full MIT license &amp; copyright notice|AI chat · Read-only|Your message and up to two recent exchanges go to Cloudflare AI/);
for(const href of ['/source','/agent-guide','/contributor-badges',...HOME_BADGES.map(badge=>badge.href)])assert.equal(homeHtml.split('href="'+href+'"').length-1,1,href+' appears once');
assert.match(homeHtml,/<img[^>]+class="relay-home-character"[^>]+src="\/brand\/relay-race-static\.png"[^>]+width="240"[^>]+height="160"/);
assert.match(homeHtml,/A free, open-source site for agents to do public work\./);
assert.match(homeHtml,/Chat with Relay\./);
assert.match(homeHtml,/placeholder="Ask a question, find something useful, submit a task, review some work, run a leg"/);
assert.doesNotMatch(homeHtml,/Hey, I’m Relay|Got a few spare minutes/);
assert.match(homeHtml,/class="relay-chat-log relay-chat-empty"/);
for(const name of ['A2A','Glama'])assert.match(trustStrip,new RegExp('alt="'+name+'" height="20"'));
const pulse=homeHtml.match(/<section class="relay-pulse-panel"[\s\S]*?<\/section>/)?.[0];
assert.ok(pulse);
for(const label of ['Outside Agents','Relay','Open Legs','Needs a first review','Independent Checks','Accepted Results'])assert.ok(pulse.includes('<dt>'+label+'</dt>'));
assert.equal((pulse.match(/<dd>/g)||[]).length,6);
assert.doesNotMatch(pulse,/<a\b|<button\b|View activity|LIVE|methodology/i);
assert.match(pulse,/<time dateTime="[^"]+">As of /);
assert.ok(homeHtml.indexOf('relay-home-intro')<homeHtml.indexOf('relay-pulse-panel'));
assert.ok(homeHtml.indexOf('relay-pulse-panel')<homeHtml.indexOf('id="relay-chat"'));
assert.ok(homeHtml.indexOf('id="relay-chat"')<homeHtml.indexOf('id="project-records"'));
assert.doesNotMatch(homeHtml,/href="\/submit"|<form[^>]+action="[^" ]*tasks/);
const privacyHtml=await (await call('/privacy')).text();
assert.match(privacyHtml,/id="relay-chat"/);assert.match(privacyHtml,/Cloudflare Workers AI/);assert.match(privacyHtml,/up to two short recent exchanges/);assert.match(privacyHtml,/at most 12 exchanges/);
assert.match(privacyHtml,/Full MIT license &amp; copyright notice/);
for(const badge of HOME_BADGES.filter(badge=>badge.src.startsWith('https://')))assert.ok(home.headers.get('content-security-policy').includes(badge.src));
assert.match(home.headers.get('content-security-policy'),/img-src 'self'/);
assert.doesNotMatch(home.headers.get('content-security-policy'),/archive\.softwareheritage\.org|\s\/brand\//,'Local badge needs no extra CSP source');
assert.doesNotMatch(agentPage.headers.get('content-security-policy'),/camo\.githubusercontent\.com|archive\.softwareheritage\.org/);

const sourceResponse=await call('/source');
const sourcePolicy=sourceResponse.headers.get('content-security-policy');
const sourceImagePolicy=sourcePolicy.split(';').find(part=>part.trim().startsWith('img-src ')).trim();
assert.equal(sourceImagePolicy,"img-src 'self' data: https://github.com/lanekingsbery/open-task-relay-public/actions/workflows/ci.yml/badge.svg https://www.a2a-registry.org/badges/verified-badge-light.svg https://glama.ai/mcp/connectors/org.opentaskrelay/open-task-relay/badges/score.svg "+SOURCE_BADGES.find(badge=>badge.name==='DOI').src);
assert.match(sourcePolicy,/script-src 'self' 'unsafe-inline';/);
assert.match(sourcePolicy,/connect-src 'self'; object-src 'none';/);
assert.doesNotMatch(agentPage.headers.get('content-security-policy'),/glama\.ai|a2a-registry\.org/);
const sourceHtml=await sourceResponse.text();
const sourceBadges=sourceHtml.match(/<ul id="source-badges"[\s\S]*?<\/ul>/)?.[0];
assert.ok(sourceBadges);
assert.deepEqual(SOURCE_BADGES.map(badge=>badge.name),['Software Heritage','DOI','Smithery']);
assert.equal((sourceBadges.match(/<a /g)||[]).length,3);
for(const badge of SOURCE_BADGES){assert.ok(sourceBadges.includes('href="'+badge.href+'"'));assert.ok(sourceBadges.includes('src="'+badge.src.replaceAll('&','&amp;')+'"'));}
assert.ok(sourceBadges.includes('alt="Open Task Relay listed on Smithery (project-made badge)"'));
assert.doesNotMatch(sourceHtml,/<ul id="project-records"/);
const discoveryHtml=sourceHtml.match(/<section aria-labelledby="discovery-title">([\s\S]*?)<\/section>/)?.[1];
assert.ok(discoveryHtml,'Source separates third-party discovery from first-party interfaces');
for(const name of ['Global A2A Registry','Awesome Agent-Native Services','A2A Directory','Smithery','Glama','mcpservers.org','FastDrop','Official MCP Registry'])assert.ok(discoveryHtml.includes(name),name);
assert.match(discoveryHtml,/org.opentaskrelay%2Fopen-task-relay\/versions\/latest/);
assert.doesNotMatch(discoveryHtml,/com\.opentaskrelay|Punkpeye|punkpeye|approved|claimed|verified remote/i);
assert.match(discoveryHtml,/not endorsements/);
assert.match(discoveryHtml,/do not establish the correctness/);
const providerImages=[...discoveryHtml.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
assert.equal(providerImages.length,2);
for(const img of providerImages){
 assert.match(img,/src="https:\/\/(www\.a2a-registry\.org\/badges\/verified-badge-light\.svg|glama\.ai\/mcp\/connectors\/org\.opentaskrelay\/open-task-relay\/badges\/score\.svg)"/);
 assert.match(img,/alt="[^"]*Open Task Relay[^"]*"/);
 assert.match(img,/width="\d+"/);assert.match(img,/height="\d+"/);
 assert.match(img,/referrerPolicy="no-referrer"/i);
}
const interfacesHtml=sourceHtml.match(/<section aria-labelledby="machine-interfaces-title">([\s\S]*?)<\/section>/)?.[1];
assert.ok(interfacesHtml?.includes('first-party public interfaces'));
for(const path of ['/api/mcp','/.well-known/agent-card.json','/openapi.json','/skill.md'])assert.ok(interfacesHtml.includes('href="https://opentaskrelay.org'+path+'"'),path);
assert.match(interfacesHtml,/A2A: legacy task retrieval only/);
assert.match(interfacesHtml,/<li>A2A task status: <code>GET \/a2a\/tasks\/\{id\}<\/code><\/li>/);
assert.doesNotMatch(interfacesHtml,/href=["'][^"']*\/a2a(?:[\/"'?#])/,'A2A operations are documentation, not browsable links');
assert.doesNotMatch(interfacesHtml,/A2A endpoint|\/a2a(?=[\s<"'?#])/,'Bare /a2a is not an implemented operation');
assert.match(sourceHtml,/v1.0.0 is the preserved citation release/);
assert.match(sourceHtml,/live service and public source may continue to evolve/);
assert.match(sourceHtml,/href="https:\/\/github.com\/lanekingsbery\/open-task-relay-public\/blob\/main\/CONTRIBUTING.md"/);
assert.doesNotMatch(sourceHtml,/https:\/\/github.com\/lanekingsbery\/open-task-relay(?:[\/"])/);
assert.match(sourceHtml,/Archived release<\/dt><dd><a[^>]+href="https:\/\/zenodo.org\/records\/22636841"/);
assert.match(sourceHtml,/Production operations are maintained separately/);
for(const label of ['Release &amp; provenance','September 7, 2026','10.5281/zenodo.22636841','10.5281/zenodo.22636840','0009-0002-1431-9760','Copy citation','GitHub Actions'])assert.ok(sourceHtml.includes(label),label);
assert.match(sourceHtml,/<a[^>]+href="https:\/\/orcid.org\/0009-0002-1431-9760"/);
assert.doesNotMatch(sourceHtml,/Created by Lane Kingsbery/);assert.ok(sourceHtml.indexOf('Cite this project')>sourceHtml.indexOf('A downloadable snapshot.'));assert.match(sourceHtml,/class="project-citation"/);
const agents=[];for(const name of ['Coordinator','Worker','Verifier'])agents.push((await (await call('/api/v1/agents','POST',{name,description:'HTTP integration',capabilities:['research']},undefined,201)).json()).data);
const [lead,worker,verifier]=agents;await call('/api/v1/rooms','POST',{name:'Bad',description:'no'},'invalid',401);await call('/api/v1/agents','POST',{name:''},undefined,422);
const post=async(p,b={},token=lead.token)=>{const data=(await (await call('/api/v1/'+p,'POST',b,token,201)).json()).data;if(data.title&&data.moderation_status==='pending')await db.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(data.id).run();return data};
const room=await post('rooms',{name:'HTTP room',description:'Real D1'});await post('messages',{room_id:room.id,content:'Hello from an external HTTP client'},worker.token);
const task=await createTaskFixture(db,{title:'HTTP workflow',description:'End-to-end',room_id:room.id},{...lead.agent,managed:1});const sub=await createTaskFixture(db,{title:'HTTP subtask',description:'Parallel work',parent_id:task.id,room_id:room.id},{...lead.agent,managed:1});await post('tasks/'+sub.id+'/claim',{},worker.token);await call('/api/v1/tasks/'+sub.id+'/claim','POST',{},verifier.token,409);
const r=await post('tasks/'+sub.id+'/results',{content:'Computed result'},worker.token);await post('tasks/'+sub.id+'/verifications',{result_id:r.id,verdict:'agree',completeness:'complete',content:'Checked',confidence:1},verifier.token);await post('tasks/'+sub.id+'/complete',{result_id:r.id});
await post('tasks/'+task.id+'/claim');await (await call('/activity')).text();await (await call('/tasks')).text();const final=await post('tasks/'+task.id+'/results',{content:'Final output'});assert.match(await (await call('/activity')).text(),/Final output/);await post('tasks/'+task.id+'/request-verification');await post('tasks/'+task.id+'/verifications',{result_id:final.id,verdict:'agree',completeness:'complete',content:'Checked final',confidence:1},verifier.token);await post('tasks/'+task.id+'/complete',{result_id:final.id});const artifact=await post('artifacts',{task_id:task.id,result_id:final.id,type:'report',description:'HTTP publication',content:'Final output'});assert.equal(artifact.provenance.produced_by,lead.agent.id);
await call('/api/v1/agents?capability=research');await call('/api/v1/feed');await call('/tasks/'+task.id);await call('/rooms/'+room.id);await call('/reports/'+artifact.id);await call('/reports/'+artifact.id+'/export');const feed=await call('/feed.xml');assert.match(await feed.text(),/HTTP publication/);await ownerMission();const ready=(await (await call('/api/tasks')).json()).data.items;assert.equal(ready.length,50);assert.ok(ready.every(t=>t.relay_leg.max_minutes<=5));const again=(await (await call('/api/tasks')).json()).data.items;assert.equal(again.length,50);assert.equal(ready[0].external_side_effects_allowed,false);const contract=(await (await call('/api/tasks/'+ready[0].id)).json()).data;assert.ok(contract.acceptance_criteria.length);assert.match(await (await call('/skill.md')).text(),/POST \/api\/tasks\/\{id\}\/results/);const taskHtml=await (await call('/tasks')).text();for(const t of ready)assert.ok(taskHtml.includes(humanCopy(t).title.replaceAll('&','&amp;')));assert.doesNotMatch(taskHtml,/No activity yet/);const hiddenCase=await mf.dispatchFetch('https://commons.test/trophy-case',{redirect:'manual'});assert.equal(hiddenCase.status,307);assert.equal(new URL(hiddenCase.headers.get('location'),'https://commons.test').href,'https://commons.test/tasks?status=solved');const acceptedHtml=await (await call('/tasks?status=solved')).text();assert.match(acceptedHtml,/HTTP workflow/);assert.match(await (await call('/trophy-case/'+task.id)).text(),/Final output/);await call('/api/v1/opportunities');await call('/api/v1/adoption');await call('/api/demo','POST',{},undefined,410);assert.equal((await (await call('/api/v1/stats')).json()).data.artifacts,1);

// Board-only presentation: exact routes and stored/API labels remain intact.
const visibleBoard=taskHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<!--.*?-->/g,'');
const pathways=visibleBoard.match(/<section class="board-pathways"[\s\S]*?<\/section>/)?.[0];
assert.ok(pathways);assert.match(pathways,/Needs a first review/);assert.match(pathways,/Open tasks/);
assert.match(pathways,/href="\/tasks\?status=pending-review&amp;sort=review"/);
assert.match(pathways,/href="\/tasks\?status=open"/);
assert.ok(visibleBoard.indexOf('board-pathways')<visibleBoard.indexOf('board-filters'));
assert.doesNotMatch(pathways,/JSON|eligibility|operator|Sort by/);
assert.match(visibleBoard,/<details class="board-help"><summary>How to contribute and review/);
assert.match(visibleBoard,/<details class="board-more-filters"><summary>More filters<\/summary>/);
const mainFilters=visibleBoard.match(/<div class="board-filter-primary">[\s\S]*?<\/div>/)?.[0];
assert.match(mainFilters,/name="category"/);assert.match(mainFilters,/name="status"/);
assert.doesNotMatch(mainFilters,/name="(?:difficulty|minutes|capability|sort)"/);
for(const field of ['minutes','difficulty','capability','sort'])assert.ok(visibleBoard.includes('name="'+field+'"'));
assert.match(visibleBoard,/type="search"/);assert.match(visibleBoard,/Search tasks on this page/);
assert.equal((visibleBoard.match(/Read existing contributions first; do not repeat completed work\./g)||[]).length,1);
const cards=visibleBoard.match(/<article class="problem-card board-row">[\s\S]*?<\/article>/g)||[];
assert.ok(cards.length);for(const card of cards){assert.match(card,/<h2><a/);assert.match(card,/class="board-next"><strong>Next step<\/strong> \S/);assert.match(card,/per contribution/);assert.match(card,/contributions?/);assert.match(card,/View task|Review task/);}
assert.match(visibleBoard,/>Start this<\/span>/);
assert.match(acceptedHtml,/>Accepted<\/span>/);assert.match(acceptedHtml,/Inspect accepted work/);
assert.match(acceptedHtml,new RegExp('href="/trophy-case/'+task.id+'"'));
const legacyFilters=(await (await call('/tasks?category=open-data&status=open&minutes=2&difficulty=easy&capability=research&sort=shortest&page=2')).text()).replace(/<!--.*?-->/g,'');
assert.match(legacyFilters,/<details class="board-more-filters" open=""><summary>More filters · active/);
for(const value of ['open-data','open','2','easy','shortest'])assert.ok(legacyFilters.includes('value="'+value+'" selected=""'));
assert.match(legacyFilters,/name="capability"[^>]*value="research"/);
assert.doesNotMatch(legacyFilters,/<input type="hidden" name="page"/);
const openOnly=(await (await call('/tasks?status=open')).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
assert.doesNotMatch(openOnly,/HTTP workflow/);assert.match(openOnly,/>Start this<\/span>/);
const reviewOnly=await (await call('/tasks?status=pending-review&sort=review')).text();
assert.match(reviewOnly,/value="pending-review" selected=""/);assert.match(reviewOnly,/value="review" selected=""/);

const partialTask=await createTaskFixture(db,{title:'Reviewed partial workflow',description:'Check both entries.',acceptance_criteria:['Check both entries.']},{...lead.agent,managed:1});
await post('tasks/'+partialTask.id+'/claim',{},worker.token);
const partialResult=await post('tasks/'+partialTask.id+'/results',{content:'First entry checked; second entry remains.'},worker.token);
const pendingBoard=(await (await call('/tasks?status=pending-review')).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
assert.match(pendingBoard,/Reviewed partial workflow/);assert.match(pendingBoard,/>Needs a first review<\/span>/);assert.match(pendingBoard,/Review task/);
assert.equal((await (await call('/api/tasks/'+partialTask.id)).json()).data.status_label,'Awaiting review');
await post('tasks/'+partialTask.id+'/verifications',{result_id:partialResult.id,verdict:'agree',completeness:'partial',content:'Accurate partial progress; criteria remain unmet.',confidence:1},verifier.token);
const partialHtml=await (await call('/tasks/'+partialTask.id)).text();
assert.match(partialHtml,/Reviewed · completion not established/);assert.doesNotMatch(partialHtml,/Review-qualified · owner verification required/);assert.match(partialHtml.replace(/<!--.*?-->/g,''),/Criteria: partial/);
await call('/api/v1/tasks/'+partialTask.id+'/complete','POST',{result_id:partialResult.id},lead.token,409);
const heldTask=await createTaskFixture(db,{title:'Owner verification fixture',description:'Produce three rows.',expected_output:'Three rows and three qualified replacement sentences.'},{...lead.agent,managed:1});
await post('tasks/'+heldTask.id+'/claim',{},worker.token);
const heldResult=await post('tasks/'+heldTask.id+'/results',{content:'Only one row is supplied.'},worker.token);
await post('tasks/'+heldTask.id+'/verifications',{result_id:heldResult.id,verdict:'agree',completeness:'complete',content:'Reviewer mistakenly asserts full completion.',confidence:1},verifier.token);
const qualifiedHtml=await (await call('/tasks/'+heldTask.id)).text();
assert.match(qualifiedHtml,/Review-qualified · owner verification required/);assert.match(qualifiedHtml,/not proof that the completion contract is satisfied/);assert.doesNotMatch(qualifiedHtml,/awaiting acceptance/);
const heldState=(await (await call('/api/v1/results/'+heldResult.id)).json()).data;
await post('tasks/'+heldTask.id+'/owner-verification',{result_id:heldResult.id,outcome:'failed',expected_review_state:heldState.owner_review_state,reason:'Two required rows and three sentences are absent.'});
const failedHtml=await (await call('/tasks/'+heldTask.id)).text();
assert.match(failedHtml,/More work needed/);assert.match(failedHtml,/Final verification found that this contribution doesn(?:&#x27;|&#39;|')t yet meet all task requirements\./);assert.match(failedHtml,/This doesn(?:&#x27;|&#39;|')t close the task; another contribution can satisfy its requirements/);assert.match(failedHtml,/Final verification history/);assert.doesNotMatch(failedHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),/owner verification failed/i);assert.match(failedHtml,/Two required rows and three sentences are absent/);assert.match(failedHtml,/Reviewer mistakenly asserts full completion/);
const heldBoardHtml=await (await call('/tasks?sort=newest')).text();assert.match(heldBoardHtml,/Needs another check/);
const heldActivityHtml=await (await call('/activity?filter=operations')).text();assert.match(heldActivityHtml,/More work needed:/);assert.doesNotMatch(heldActivityHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),/owner verification failed/i);
await call('/api/v1/tasks/'+heldTask.id+'/complete','POST',{result_id:heldResult.id},lead.token,409);


for(const path of ['/api/tasks/'+task.id+'/evidence','/api/v1/tasks/'+task.id+'/evidence']){const bundle=(await (await call(path)).json()).data;assert.equal(bundle.status,'accepted');assert.equal(bundle.acceptance.snapshot_available,true);assert.equal(bundle.canonical_url,'https://opentaskrelay.org/trophy-case/'+task.id);assert.equal(bundle.reviews.length,1)}
// Public aliases preserve the envelope, result binding and digest; partial work stays 404.
const receiptResponses=[];
for(const prefix of ['/api/tasks/','/api/v1/tasks/']){
 const response=await call(prefix+task.id+'/evidence');assert.equal(response.headers.get('cache-control'),'no-store');const envelope=await response.json();assert.deepEqual(Object.keys(envelope),['data']);
 const receipt=envelope.data;assert.equal(receipt.schema_version,'1.0');assert.equal(receipt.result.id,final.id);assert.ok(receipt.reviews.every(v=>v.result_id===final.id));assert.equal(receipt.result.content_sha256,createHash('sha256').update(receipt.result.content,'utf8').digest('hex'));receiptResponses.push(envelope);
 await call(prefix+partialTask.id+'/evidence','GET',undefined,undefined,404);
}
assert.deepEqual(receiptResponses[0],receiptResponses[1]);
const evidenceSpec=(await (await call('/openapi.json')).json()).paths['/tasks/{id}/evidence'].get;assert.match(evidenceSpec.externalDocs.url,/COMPLETION-RECEIPTS.md$/);
const bundleHtml=await (await call('/trophy-case/'+task.id)).text();for(const label of ['Copy citation','View JSON','Supporting evidence','Reviews &amp; independence','Disputes &amp; limitations','License &amp; citation'])assert.ok(bundleHtml.includes(label),label);
const acceptedReader=bundleHtml.split('<details class="record-details">')[0];
assert.match(bundleHtml,/<details class="record-details"><summary>Full evidence &amp; audit trail<\/summary>/);
for(const label of ['What we learned','Final output','Verification','Verifier','Sources / evidence'])assert.ok(acceptedReader.includes(label),label);
assert.ok(acceptedReader.indexOf('What we learned')<acceptedReader.indexOf('Verification'));
assert.ok(acceptedReader.indexOf('Verification')<acceptedReader.indexOf('Sources / evidence'));
assert.doesNotMatch(acceptedReader,/Task &amp; acceptance criteria|SHA-256|View JSON/);
const robots=await (await call('/robots.txt')).text();assert.match(robots,/Allow: \/\n/);assert.doesNotMatch(robots,/Disallow: \/\n/);assert.match(robots,/sitemap.xml/i);for(const path of ['/tasks','/api/tasks','/agent-guide','/skill.md','/agents.json','/openapi.json'])assert.ok(robots.includes('Allow: '+path+'\n'));for(const path of ['/moderation','/api/moderation','/my-problems','/api/v1/agents/me','/api/v1/agents/recover'])assert.ok(robots.includes('Disallow: '+path+'\n'));
// Simple first-match parsers and RFC longest-match parsers must agree on these paths.
const rules=robots.split('\n').filter(line=>/^(Allow|Disallow): /.test(line)).map(line=>{const [kind,path]=line.split(': ');return {kind,path};});
for(const path of ['/tasks','/tasks/'+task.id,'/api/tasks','/api/tasks/'+task.id,'/api/tasks/'+task.id+'/results','/agent-guide','/skill.md','/agents.json','/openapi.json','/moderation','/api/moderation','/my-problems','/api/v1/agents/me/credentials','/api/v1/agents/recover']){
 const matching=rules.filter(r=>path.startsWith(r.path));const first=matching[0];const longest=[...matching].sort((a,b)=>b.path.length-a.path.length)[0];assert.equal(first.kind,longest.kind,path);
}
const sitemap=await (await call('/sitemap.xml')).text();for(const path of ['/tasks/'+task.id,'/agent-guide','/about','/docs'])assert.ok(sitemap.includes('https://opentaskrelay.org'+path));assert.doesNotMatch(sitemap,/\/moderation|\?status=|\/trophy-case/);
const machine=(await (await call('/api/tasks/'+ready[0].id)).json()).data;assert.ok(machine.relay_leg.next_action);assert.ok(machine.relay_leg.source_urls);assert.ok(machine.relay_leg.desired_output);assert.ok(machine.status_label);
const legacyTask=await db.prepare("SELECT id FROM tasks WHERE json_extract(protocol,'$.relay_leg_minutes')>5 AND status='open' AND moderation_status='approved' ORDER BY id LIMIT 1").first();assert.ok(legacyTask,'Existing seed handoffs remain stored with legacy budgets even when new tasks fill the first page');
const storedBefore=(await db.prepare('SELECT protocol FROM tasks WHERE id=?').bind(legacyTask.id).first()).protocol;
const workspace=(await (await call('/tasks/'+legacyTask.id)).text()).replace(/<[^>]*>/g,'');
assert.match(workspace,/30 seconds–5 minutes/);assert.match(workspace,/Send your AI in/); // The task prompt dialog mounts on interaction; its text is covered above and in the prompt unit test.
assert.equal((await db.prepare('SELECT protocol FROM tasks WHERE id=?').bind(legacyTask.id).first()).protocol,storedBefore);
const filteredBoard=(await (await call('/tasks?minutes=3&sort=shortest')).text()).replace(/<[^>]*>/g,'');
assert.match(filteredBoard,/Time per contribution/);assert.match(filteredBoard,/Up to 3 min/);assert.doesNotMatch(filteredBoard,/Up to (?:10|15) min/);
const boardFirst=await (await call('/tasks?sort=newest&status=open')).text();assert.match(boardFirst,/aria-label="Task pages"/);assert.match(boardFirst,/More tasks/);
const boardSecond=await (await call('/tasks?page=2&sort=newest&status=open')).text(),pager=boardSecond.match(/<nav class="board-sort" aria-label="Task pages">[\s\S]*?<\/nav>/)?.[0];
assert.ok(pager);for(const value of ['page=1','page=3','sort=newest','status=open','Previous tasks','More tasks'])assert.ok(pager.includes(value));
const boardThird=await (await call('/tasks?page=3&sort=newest&status=open')).text(),lastPager=boardThird.match(/<nav class="board-sort" aria-label="Task pages">[\s\S]*?<\/nav>/)?.[0];
assert.ok(lastPager);assert.match(lastPager,/page=2/);assert.doesNotMatch(lastPager,/More tasks/);
assert.doesNotMatch(boardSecond,/<input type="hidden" name="page"/,'Changing sort or filters starts on the first page');

const guest=async(path,value,expected=201,ip='192.0.2.31',origin='https://commons.test')=>{const r=await mf.dispatchFetch('https://commons.test'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'CF-Connecting-IP':ip},body:JSON.stringify(value)});assert.equal(r.status,expected,await r.clone().text());return r.json()};
const brief={request_id:crypto.randomUUID(),title:'Compare these public totals',problem:'Compare the public source totals and explain any mismatch in the counts.',done:'List each mismatch with enough evidence to reproduce it.',sources:['https://example.org/data'],category:'open-data',public_consent:true,website:''};
await guest('/api/problems',brief,410);await guest('/api/problems',brief,410);
const created=await createTaskFixture(db,{title:brief.title,description:brief.problem,acceptance_criteria:[brief.done],category:brief.category},lead.agent);
assert.equal((await db.prepare('SELECT count(*) AS n FROM human_problems WHERE task_id=?').bind(created.id).first()).n,0);
assert.equal((await db.prepare('SELECT moderation_status FROM tasks WHERE id=?').bind(created.id).first()).moderation_status,'pending');
assert.equal((await (await call('/api/tasks')).json()).data.items.some(t=>t.id===created.id),false);
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),public_consent:false},410,'192.0.2.32');
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),website:'spam'},410,'192.0.2.32');
await guest('/api/problems',brief,410,'192.0.2.32','https://evil.example');
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),sources:['https://127.0.0.1/private']},410,'192.0.2.32');
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),title:'A fourth request'},410,'192.0.2.32');
const note={request_id:crypto.randomUUID(),kind:'ai_draft',content:'A pasted partial finding with an uncertainty and source: https://example.org/data',public_consent:true,website:''};
await guest('/api/discussions/'+created.id,note,409);
await db.prepare("UPDATE tasks SET moderation_status='approved' WHERE id=?").bind(created.id).run();
const published=(await guest('/api/discussions/'+created.id,note)).data;
assert.equal((await guest('/api/discussions/'+created.id,note)).data.id,published.id);
await guest('/api/discussions/'+created.id,{...note,content:'Different content under the same request key'},409);
const notes=(await (await call('/api/discussions/'+created.id)).json()).data.items;assert.equal(notes.length,1);assert.equal(notes[0].kind,'ai_draft');assert.equal(notes[0].content_hash,undefined);
assert.equal((await db.prepare('SELECT count(*) AS n FROM results WHERE task_id=?').bind(created.id).first()).n,0);
const detailHtml=await (await call('/tasks/'+created.id)).text();assert.match(detailHtml,/Discussion/);assert.match(detailHtml,/Anonymous|visitor-pasted/);assert.match(detailHtml,/Public work/);assert.match(detailHtml,/What should the next agent do/);assert.match(detailHtml,/Current state/);assert.match(detailHtml,/No agent contributions yet/);
await guest('/api/discussions/'+created.id,{...note,request_id:crypto.randomUUID(),content:'<script>alert("test")</script> A plain-text example.'});
assert.match(await (await call('/tasks/'+created.id)).text(),/&lt;script&gt;/);
await guest('/api/discussions/'+created.id,{...note,request_id:crypto.randomUUID(),content:'secret sk-'+'a'.repeat(30)},422);
await guest('/api/discussions/'+created.id,{request_id:crypto.randomUUID(),action:'report',comment_id:published.id,reason:'Please inspect this test report.',website:'',public_consent:true});
await call('/api/moderation','POST',{action:'hide_comment',comment_id:published.id,reason:'Unauthorized attempt'},undefined,403);
await hideComment(db,{comment_id:published.id,reason:'A local moderation test.'});
const hidden=(await (await call('/api/discussions/'+created.id)).json()).data.items.find(c=>c.id===published.id);assert.equal(hidden.hidden,1);assert.equal(hidden.content,'');
assert.doesNotMatch(await (await call('/tasks/'+created.id)).text(),/A pasted partial finding/);
await db.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(created.id).run();
await guest('/api/discussions/'+created.id,{...note,request_id:crypto.randomUUID()},409);
assert.match(homeHtml,/id="relay-chat"/);assert.match(homeHtml,/role="log"/);assert.match(homeHtml,/Message Relay/);assert.match(homeHtml,/Send message/);
assert.doesNotMatch(homeHtml,/Clear chat|A feel for the conversation|Say hello/);
await matchRelayReleaseTasks(db);
const relayResponse=await ownerMission('?relay=1');assert.equal((await relayResponse.json()).data.published.length,19);
assert.equal((await (await ownerMission('?relay=1')).json()).data.published.length,0);
const populatedHome=await (await call('/')).text();
assert.match(populatedHome,/class="relay-pulse-panel"/);
assert.doesNotMatch(populatedHome,/home-tasks-title|featured-mission|Swarm Demo|Active agents/);
assert.match(populatedHome,/id="relay-chat"/);
assert.match(await (await call('/tasks?status=pending-review')).text(),/Needs a first review/);

// Synthetic direct/secondary visibility through built REST, MCP and UI routes.
const hiddenTask=await createTaskFixture(db,{title:'HIDDEN_PARENT_SENTINEL',description:'HIDDEN_BRIEF_SENTINEL',room_id:room.id},{...lead.agent,managed:1});
await post('tasks/'+hiddenTask.id+'/claim',{},worker.token);
const hiddenResult=await post('tasks/'+hiddenTask.id+'/results',{content:'HIDDEN_RESULT_SENTINEL'},worker.token);
const hiddenArtifact=await post('artifacts',{task_id:hiddenTask.id,result_id:hiddenResult.id,type:'report',description:'HIDDEN_ARTIFACT_SENTINEL',content:'HIDDEN_CONTENT_SENTINEL'},worker.token);
await db.prepare("UPDATE tasks SET status='closed' WHERE id=?").bind(hiddenTask.id).run();
assert.match(await (await call('/tasks/'+hiddenTask.id)).text(),/Historical contribution · review closed/);
await db.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(hiddenTask.id).run();
for(const path of ['/api/v1/results/'+hiddenResult.id,'/api/v1/artifacts/'+hiddenArtifact.id,'/results/'+hiddenResult.id,'/artifacts/'+hiddenArtifact.id,'/reports/'+hiddenArtifact.id,'/reports/'+hiddenArtifact.id+'/export']){const response=await call(path,'GET',undefined,undefined,404);assert.doesNotMatch(await response.text(),/HIDDEN_[A-Z_]+_SENTINEL/);}
for(const path of ['/api/tasks/'+hiddenTask.id,'/api/v1/agents/'+lead.agent.id,'/api/v1/rooms/'+room.id,'/feed.xml','/sitemap.xml','/artifacts','/tasks/'+hiddenTask.id])assert.doesNotMatch(await (await call(path)).text(),/HIDDEN_[A-Z_]+_SENTINEL/);
for(const path of ['/api/mcp','/mcp']){const response=await call(path,'POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'read_commons',arguments:{path:'results/'+hiddenResult.id}}},undefined,404);assert.doesNotMatch(await response.text(),/HIDDEN_RESULT_SENTINEL/);}
for(const path of ['/','/tasks','/about','/my-problems','/agent-guide'])assert.doesNotMatch(await (await call(path)).text(),/href="\/submit"/);
assert.doesNotMatch(await (await call('/sitemap.xml')).text(),/<loc>[^<]*\/submit<\/loc>/);
const missionBefore=(await db.prepare('SELECT count(*) n FROM tasks').first()).n;
await ownerMission('?daily=1');assert.equal((await db.prepare('SELECT count(*) n FROM tasks').first()).n,missionBefore,'Daily owner curation respects existing backlog');

// Authenticated owner controls exercise real routing and D1; local identity
// headers are trusted only by this fixture. owner-access tests separately prove
// production strips forged headers and verifies the Cloudflare Access JWT.
const modRoom=await post('rooms',{name:'Moderation HTTP fixture',description:'Local only'});
const modMessage=await post('messages',{room_id:modRoom.id,content:'HTTP hidden sentinel'});
const modInput={action:'agent_content',entity_type:'messages',entity_id:modMessage.id,decision:'hidden',reason:'Private HTTP audit sentinel'};
const modRequest=(value,email='moderator@example.invalid',origin='https://commons.test')=>mf.dispatchFetch('https://commons.test/api/moderation',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(email?{'oai-authenticated-user-email':email}:{})},body:JSON.stringify(value)});
for(const [email,origin] of [[null,'https://commons.test'],['other@example.invalid','https://commons.test'],['moderator@example.invalid','https://foreign.invalid']])assert.equal((await modRequest(modInput,email,origin)).status,403);
assert.equal((await modRequest({...modInput,decision:'restricted'})).status,422);
await call('/activity?filter=all'); // Warm the public projection before hiding.
assert.equal((await modRequest(modInput)).status,200);
for(const path of ['/api/v1/messages','/api/v1/rooms/'+modRoom.id,'/api/v1/feed','/activity?filter=all','/activity?filter=operations']){
 const result=await call(path),text=await result.text();assert.ok(!text.includes('HTTP hidden sentinel'),path);assert.ok(!text.includes('Private HTTP audit sentinel'),path);
}
await call('/api/v1/messages/'+modMessage.id,'GET',undefined,undefined,404);await call('/messages/'+modMessage.id,'GET',undefined,undefined,404);
const ownerQueue=await mf.dispatchFetch('https://commons.test/api/moderation',{headers:{'oai-authenticated-user-email':'moderator@example.invalid'}});
assert.equal(ownerQueue.status,200);assert.match(ownerQueue.headers.get('cache-control'),/private, no-store/);
const privateQueue=await ownerQueue.json();assert.equal(privateQueue.data.messages.find(m=>m.id===modMessage.id).content,'HTTP hidden sentinel');assert.ok(privateQueue.data.agent_actions.some(m=>m.reason==='Private HTTP audit sentinel'));
const restrict={action:'agent_content',entity_type:'agents',entity_id:lead.agent.id,decision:'restricted',reason:'Local HTTP behavior restriction'};
assert.equal((await modRequest(restrict)).status,200);await call('/api/v1/messages','POST',{room_id:modRoom.id,content:'Blocked HTTP'},lead.token,403);
assert.equal((await modRequest({...restrict,decision:'unrestricted',reason:'Local restoration after review'})).status,200);
await post('messages',{room_id:modRoom.id,content:'Restored HTTP posting'});
await call('/api/v1/messages/'+modMessage.id,'GET',undefined,undefined,404); // Account restore never unhides messages.
assert.equal((await modRequest({...modInput,decision:'restored',reason:'Local message restoration'})).status,200);
assert.equal((await (await call('/api/v1/messages/'+modMessage.id)).json()).data.content,'HTTP hidden sentinel');
assert.equal((await db.prepare('SELECT count(*) n FROM agent_moderation').first()).n,4);

}finally{await mf.dispose()}});

test('board cards preserve task content and translate display labels only',async(t)=>{
 const {createServer}=await import('vite');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const root=new URL('../',import.meta.url).pathname;
 const vite=await createServer({configFile:false,root,appType:'custom',resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]}});
 try{
  const {ProblemCard}=await vite.ssrLoadModule('/components/work-cards.tsx');
  const {statusLabel}=await vite.ssrLoadModule('/lib/public-work.ts');
  const fixture={id:'fixture',title:'Compare the two dated notices',objective:'The provider lists two different opening times.',status:'open',moderation_status:'approved',category:'civic',next_action:'Read existing contributions first; do not repeat completed work. Record both dates; leave the time unresolved unless a dated update settles it.',relay_leg_minutes:3,contribution_count:2,note_count:1,last_work_at:'2026-09-20T12:00:00Z'};
  const render=task=>renderToStaticMarkup(ProblemCard({task}));
  await t.test('original context, full task-specific action, metadata and detail link survive',()=>{
   const before=JSON.stringify(fixture),html=render(fixture);
   for(const text of [fixture.title,fixture.objective,'Record both dates; leave the time unresolved unless a dated update settles it.','Up to 3 min','2 contributions · 1 notes','Work updated 2026-09-20','href="/tasks/fixture"'])assert.ok(html.includes(text),text);
   assert.doesNotMatch(html,/Read existing contributions first/);
   assert.equal(JSON.stringify(fixture),before);
   const unique='Read existing contributions first; verify the author’s revised source before repeating the measurement.';
   assert.ok(render({...fixture,next_action:unique}).includes('verify the author'));
   assert.ok(render({...fixture,next_action:'Read existing contributions first; do not repeat completed work.'}).includes('Read existing contributions first; do not repeat completed work.'));
  });
  for(const [fields,machine,human] of [
   [{status:'open'},'Open','Start this'],
   [{status:'submitted'},'Awaiting review','Needs review'],
   [{status:'verified',owner_verification_failed:true},'More work needed','Needs another check'],
   [{status:'completed'},'Accepted result','Accepted'],
   [{status:'disputed'},'Disputed','Disputed'],
   [{status:'verified',owner_attention_required:true},'Review-qualified · owner verification required','Review-qualified · owner verification required'],
   [{status:'open',expires_at:'2020-01-01T00:00:00Z'},'Expired','Expired']
  ])await t.test(machine+' → '+human,()=>{
   const task={...fixture,...fields},before=JSON.stringify(task);
   assert.equal(statusLabel(task),machine);
   assert.ok(render(task).includes('>'+human+'</span>'));
   assert.equal(JSON.stringify(task),before);
  });
 }finally{await vite.close()}
});

// Exercise the presentational component independently of D1, including failure
// and zero snapshots so unavailable counts can never be mistaken for zero.
test('Relay Pulse preserves metric values and handles unavailable snapshots without navigation',async()=>{
 const {createRequire}=await import('node:module');
 const {transpileModule,ModuleKind,JsxEmit}=await import('typescript');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {createElement}=await import('react');
 const output=transpileModule(readFileSync('components/relay-scoreboard.tsx','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,jsx:JsxEmit.ReactJSX}}).outputText;
 const exports={};runInNewContext(output,{exports,require:createRequire(import.meta.url)});
 const render=stats=>renderToStaticMarkup(createElement(exports.default,{stats}));
 const stats={outside_agents:1234,relay_agents:2,open_relay_legs:3,awaiting_independent_check:4,independent_checks:5,accepted_results:6,as_of:'2026-09-27T08:15:00.000Z'};
 const html=render(stats);
 assert.deepEqual([...html.matchAll(/<dd>(.*?)<\/dd>/g)].map(match=>match[1]),['1,234','2','3','4','5','6']);
 assert.match(html,/As of 2026-09-27 · 08:15 UTC/);
 const zeros=render(Object.fromEntries(Object.entries(stats).map(([key,value])=>[key,key==='as_of'?value:0])));
 assert.equal((zeros.match(/<dd>0<\/dd>/g)||[]).length,6);
 const unavailable=render(null);
 assert.equal((unavailable.match(/<dd>—<\/dd>/g)||[]).length,6);
 assert.match(unavailable,/Snapshot unavailable/);assert.doesNotMatch(unavailable,/<time/);
 for(const markup of [html,zeros,unavailable])assert.doesNotMatch(markup,/<a\b|<button\b|LIVE|View activity/i);
});
