import {OPENAIRE_RECORD,SOFTWARE_HERITAGE_RECORD,VERSION_DOI} from '../lib/project-links.ts';
import {MIT_LICENSE_TEXT} from '../lib/license.ts';
import {hideComment} from '../lib/guest-board.ts';
import {humanCopy} from '../lib/human-copy.ts';
import {matchRelayReleaseTasks} from './relay-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('built Worker routes and real D1 HTTP workflow',async()=>{
const mf=new Miniflare(convertV4MiniflareOptions({modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),modulesRoot:'dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{MODERATOR_EMAIL:'moderator@example.invalid'},serviceBindings:{ASSETS:async(request)=>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/__relay_assets/')||path.includes('..')||!existsSync('dist/client'+path))return new Response('Not found',{status:404});
 const bytes=readFileSync('dist/client'+path),etag='"'+createHash('sha256').update(bytes).digest('hex')+'"';
 const headers={'ETag':etag,'Cache-Control':'public, max-age=0, must-revalidate','Content-Type':path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':'application/octet-stream'};
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
const call=async(path,method='GET',body,token,expected=200)=>{const r=await mf.dispatchFetch('https://commons.test'+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});assert.equal(r.status,expected,await r.clone().text());return r};
for(const route of ['/','/activity','/agents','/rooms','/tasks','/artifacts','/docs','/about','/connect','/adoption','/tools','/tools/citation-audit','/tools/validate-json','/source','/contact','/security','/submit','/privacy','/results','/messages','/my-problems']){const r=await call(route);const html=await r.text();assert.match(html,/Open-Task-Relay/);assert.doesNotMatch(html,/>Agent Commons</)}
const response=await mf.dispatchFetch('https://opentaskrelay.org/agents.json');const manifest=await response.json();assert.equal(manifest.canonical_url,'https://opentaskrelay.org');assert.equal(manifest.tasks,'https://opentaskrelay.org/api/tasks');assert.equal(manifest.relay_leg.max_minutes,5);
const guide=await (await mf.dispatchFetch('https://opentaskrelay.org/skill.md')).text();assert.ok(guide.includes('https://opentaskrelay.org/api/tasks?max_leg_minutes=5'));
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
await call('/api/tasks','POST',{title:'Unauthenticated fixture',description:'Must never create a task'},undefined,401);

for(const route of ['/.well-known/agent-card.json','/agents.json','/openapi.json','/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt','/skill.md','/agent-guide','/api/tasks'])await call(route);
await call('/does-not-exist','GET',undefined,undefined,404);await call('/tasks/not-a-uuid','GET',undefined,undefined,404);
await call('/api/moderation','GET',undefined,undefined,403);await call('/api/moderation','POST',{task_id:'00000000-0000-4000-8000-000000000001',decision:'approved',reason:'Unauthorized review attempt'},undefined,403);
const submitHtml=await (await call('/submit')).text();assert.match(submitHtml,/no account needed/);assert.match(submitHtml,/Submit task/);assert.doesNotMatch(submitHtml,/Sign in with ChatGPT|Coming soon/);
assert.match(await (await call('/my-problems')).text(),/bookmark is your follow button/);
assert.equal((await (await call('/api/problems')).json()).data.account_required,false);
await call('/api/problems','POST',{},undefined,403);
const initialized=await call('/api/mcp','POST',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'integration-test',version:'1'}}});assert.equal((await initialized.json()).result.protocolVersion,'2025-11-25');
const filtered=await call('/agents?capability=source-verification');assert.match(await filtered.text(),/value="source-verification"/);
const utilityResponse=await call('/api/v1/utilities/citation-audit','POST',{sources:['doi:10.1000/abc','https://doi.org/10.1000/abc']});assert.equal((await utilityResponse.json()).data.duplicate_groups.length,1);
assert.equal((await (await call('/api/v1/utilities/validate-json','POST',{text:'{}'})).json()).data.valid,true);
const home=await call('/');const homeHtml=await home.clone().text();assert.match(homeHtml,/A few minutes of AI/);assert.match(homeHtml,/property="og:title" content="Open-Task-Relay"/);assert.match(homeHtml,/brand\/share.png/);assert.equal((homeHtml.match(/<header/g)||[]).length,1);assert.ok(home.headers.get('strict-transport-security'));assert.ok(home.headers.get('content-security-policy'));assert.doesNotMatch(homeHtml,/<meta[^>]+(?:noindex|nofollow)/);assert.match(homeHtml,/<link rel="canonical" href="https:\/\/opentaskrelay.org"/);
// Branding is presentation-only; homepage identity links remain deliberately limited.
assert.match(homeHtml,/class="wordmark-version">v1<\/span>/);
assert.ok(homeHtml.includes(VERSION_DOI));
assert.doesNotMatch(homeHtml,/<a[^>]+href="https:\/\/orcid.org\//);
assert.doesNotMatch(homeHtml,/Lane Kingsbery|Kingsbery, L\./);
assert.doesNotMatch(homeHtml,/The first trophy|Trophy Case|href="\/trophy-case|flow-visual/);
assert.match(homeHtml,/href="\/about#public-beta"/);
assert.equal((homeHtml.match(/class="relay-step-number"/g)||[]).length,5);
assert.equal(MIT_LICENSE_TEXT.replaceAll('\r\n','\n'),readFileSync('LICENSE','utf8').replaceAll('\r\n','\n'));
const trustStrip=homeHtml.match(/<ul id="project-records"[\s\S]*?<\/ul>/)?.[0];
assert.ok(trustStrip);
for(const label of ['Open Source','GitHub','10.5281/zenodo.22636841','Indexed in OpenAIRE','Archived in Software Heritage'])assert.ok(trustStrip.includes(label),label);
assert.equal((trustStrip.match(/<a /g)||[]).length,5);
assert.ok(trustStrip.includes(OPENAIRE_RECORD));assert.ok(trustStrip.includes(SOFTWARE_HERITAGE_RECORD));
assert.match(trustStrip,/href="\/source"/);assert.match(trustStrip,/href="https:\/\/github.com\/lanekingsbery\/open-task-relay-public"/);
assert.doesNotMatch(trustStrip,/MIT|badge.svg|Sourced/);
assert.doesNotMatch(homeHtml,/Swarm Demo|swarm-demo|registered accounts|Community agents:/);
const primaryNav=homeHtml.match(/<nav aria-label="Main navigation">[\s\S]*?<\/nav>/)?.[0];
for(const label of ['Tasks','Activity','Solved','Submit','For Agents'])assert.ok(primaryNav?.includes(label));
assert.doesNotMatch(primaryNav,/Problems/);
assert.equal((primaryNav.match(/<a /g)||[]).length,5);
assert.doesNotMatch(homeHtml,/Citable|record-badge-label|Zenodo certified|copyright registered/i);
assert.match(homeHtml,/© 2026 Open-Task-Relay contributors/);
assert.match(homeHtml,/Full MIT license &amp; copyright notice/);
assert.match(homeHtml,/THE SOFTWARE IS PROVIDED/);
assert.match(home.headers.get('content-security-policy'),/https:\/\/github.com\/lanekingsbery\/open-task-relay-public\/actions\/workflows\/ci.yml\/badge.svg;/);

const sourceHtml=await (await call('/source')).text();
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
const task=await post('tasks',{title:'HTTP workflow',description:'End-to-end',room_id:room.id});const sub=await post('tasks/'+task.id+'/subtasks',{title:'HTTP subtask',description:'Parallel work'});await post('tasks/'+sub.id+'/claim',{},worker.token);await call('/api/v1/tasks/'+sub.id+'/claim','POST',{},verifier.token,409);
const r=await post('tasks/'+sub.id+'/results',{content:'Computed result'},worker.token);await post('tasks/'+sub.id+'/verifications',{result_id:r.id,verdict:'agree',content:'Checked',confidence:1},verifier.token);await post('tasks/'+sub.id+'/complete',{result_id:r.id});
await post('tasks/'+task.id+'/claim');await (await call('/activity')).text();await (await call('/tasks')).text();const final=await post('tasks/'+task.id+'/results',{content:'Final output'});assert.match(await (await call('/activity')).text(),/Final output/);await post('tasks/'+task.id+'/request-verification');await post('tasks/'+task.id+'/verifications',{result_id:final.id,verdict:'agree',content:'Checked final',confidence:1},verifier.token);await post('tasks/'+task.id+'/complete',{result_id:final.id});const artifact=await post('artifacts',{task_id:task.id,result_id:final.id,type:'report',description:'HTTP publication',content:'Final output'});assert.equal(artifact.provenance.produced_by,lead.agent.id);
await call('/api/v1/agents?capability=research');await call('/api/v1/feed');await call('/tasks/'+task.id);await call('/rooms/'+room.id);await call('/reports/'+artifact.id);await call('/reports/'+artifact.id+'/export');const feed=await call('/feed.xml');assert.match(await feed.text(),/HTTP publication/);await call('/api/missions','POST');const ready=(await (await call('/api/tasks')).json()).data.items;assert.equal(ready.length,50);assert.ok(ready.every(t=>t.relay_leg.max_minutes<=5));const again=(await (await call('/api/tasks')).json()).data.items;assert.equal(again.length,50);assert.equal(ready[0].external_side_effects_allowed,false);const contract=(await (await call('/api/tasks/'+ready[0].id)).json()).data;assert.ok(contract.acceptance_criteria.length);assert.match(await (await call('/skill.md')).text(),/POST \/api\/tasks\/\{id\}\/results/);const taskHtml=await (await call('/tasks')).text();for(const t of ready)assert.ok(taskHtml.includes(humanCopy(t).title.replaceAll('&','&amp;')));assert.doesNotMatch(taskHtml,/No activity yet/);const hiddenCase=await mf.dispatchFetch('https://commons.test/trophy-case',{redirect:'manual'});assert.equal(hiddenCase.status,307);assert.equal(new URL(hiddenCase.headers.get('location'),'https://commons.test').href,'https://commons.test/tasks?status=solved');const acceptedHtml=await (await call('/tasks?status=solved')).text();assert.match(acceptedHtml,/HTTP workflow/);assert.match(await (await call('/trophy-case/'+task.id)).text(),/Final output/);await call('/api/v1/opportunities');await call('/api/v1/adoption');await call('/api/demo','POST');assert.equal((await (await call('/api/v1/stats')).json()).data.artifacts,2);

for(const path of ['/api/tasks/'+task.id+'/evidence','/api/v1/tasks/'+task.id+'/evidence']){const bundle=(await (await call(path)).json()).data;assert.equal(bundle.status,'accepted');assert.equal(bundle.acceptance.snapshot_available,true);assert.equal(bundle.canonical_url,'https://opentaskrelay.org/trophy-case/'+task.id);assert.equal(bundle.reviews.length,1)}
const bundleHtml=await (await call('/trophy-case/'+task.id)).text();for(const label of ['Copy citation','View JSON','Supporting evidence','Reviews &amp; independence','Disputes &amp; limitations','License &amp; citation'])assert.ok(bundleHtml.includes(label),label);
const robots=await (await call('/robots.txt')).text();assert.match(robots,/Allow: \/\n/);assert.doesNotMatch(robots,/Disallow: \/\n/);assert.match(robots,/sitemap.xml/i);for(const path of ['/tasks','/api/tasks','/agent-guide','/skill.md','/agents.json','/openapi.json'])assert.ok(robots.includes('Allow: '+path+'\n'));for(const path of ['/moderation','/api/moderation','/my-problems','/api/v1/agents/me','/api/v1/agents/recover'])assert.ok(robots.includes('Disallow: '+path+'\n'));
// Simple first-match parsers and RFC longest-match parsers must agree on these paths.
const rules=robots.split('\n').filter(line=>/^(Allow|Disallow): /.test(line)).map(line=>{const [kind,path]=line.split(': ');return {kind,path};});
for(const path of ['/tasks','/tasks/'+task.id,'/api/tasks','/api/tasks/'+task.id,'/api/tasks/'+task.id+'/results','/agent-guide','/skill.md','/agents.json','/openapi.json','/moderation','/api/moderation','/my-problems','/api/v1/agents/me/credentials','/api/v1/agents/recover']){
 const matching=rules.filter(r=>path.startsWith(r.path));const first=matching[0];const longest=[...matching].sort((a,b)=>b.path.length-a.path.length)[0];assert.equal(first.kind,longest.kind,path);
}
const sitemap=await (await call('/sitemap.xml')).text();for(const path of ['/tasks/'+task.id,'/agent-guide','/about','/docs'])assert.ok(sitemap.includes('https://opentaskrelay.org'+path));assert.doesNotMatch(sitemap,/\/moderation|\?status=|\/trophy-case/);
const machine=(await (await call('/api/tasks/'+ready[0].id)).json()).data;assert.ok(machine.relay_leg.next_action);assert.ok(machine.relay_leg.source_urls);assert.ok(machine.relay_leg.desired_output);assert.ok(machine.status_label);
const legacyTask=ready.find(t=>t.relay_leg_minutes>5);assert.ok(legacyTask,'Existing seed handoffs remain stored with legacy budgets');
const storedBefore=(await db.prepare('SELECT protocol FROM tasks WHERE id=?').bind(legacyTask.id).first()).protocol;
const workspace=(await (await call('/tasks/'+legacyTask.id)).text()).replace(/<[^>]*>/g,'');
assert.match(workspace,/30 seconds–5 minutes/);assert.match(workspace,/Send your AI in/); // The task prompt dialog mounts on interaction; its text is covered above and in the prompt unit test.
assert.equal((await db.prepare('SELECT protocol FROM tasks WHERE id=?').bind(legacyTask.id).first()).protocol,storedBefore);
const filteredBoard=(await (await call('/tasks?minutes=3&sort=shortest')).text()).replace(/<[^>]*>/g,'');
assert.match(filteredBoard,/Time per contribution/);assert.match(filteredBoard,/Up to 3 min/);assert.doesNotMatch(filteredBoard,/Up to (?:10|15) min/);
const boardFirst=await (await call('/tasks?sort=newest&status=open')).text();assert.match(boardFirst,/aria-label="Task pages"/);assert.match(boardFirst,/More tasks/);
const boardSecond=await (await call('/tasks?page=2&sort=newest&status=open')).text(),pager=boardSecond.match(/<nav class="board-sort" aria-label="Task pages">[\s\S]*?<\/nav>/)?.[0];
assert.ok(pager);for(const value of ['page=1','sort=newest','status=open','Previous tasks'])assert.ok(pager.includes(value));assert.doesNotMatch(pager,/More tasks/);
assert.doesNotMatch(boardSecond,/<input type="hidden" name="page"/,'Changing sort or filters starts on the first page');

const guest=async(path,value,expected=201,ip='192.0.2.31',origin='https://commons.test')=>{const r=await mf.dispatchFetch('https://commons.test'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'CF-Connecting-IP':ip},body:JSON.stringify(value)});assert.equal(r.status,expected,await r.clone().text());return r.json()};
const brief={request_id:crypto.randomUUID(),title:'Compare these public totals',problem:'Compare the public source totals and explain any mismatch in the counts.',done:'List each mismatch with enough evidence to reproduce it.',sources:['https://example.org/data'],category:'open-data',public_consent:true,website:''};
const created=(await guest('/api/problems',brief)).data;
const replay=(await guest('/api/problems',brief)).data;assert.equal(created.id,replay.id);
assert.equal((await db.prepare('SELECT count(*) AS n FROM human_problems WHERE task_id=?').bind(created.id).first()).n,0);
assert.equal((await db.prepare('SELECT moderation_status FROM tasks WHERE id=?').bind(created.id).first()).moderation_status,'pending');
assert.equal((await (await call('/api/tasks')).json()).data.items.some(t=>t.id===created.id),false);
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),public_consent:false},422,'192.0.2.32');
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),website:'spam'},422,'192.0.2.32');
await guest('/api/problems',brief,403,'192.0.2.32','https://evil.example');
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),sources:['https://127.0.0.1/private']},422,'192.0.2.32');
await guest('/api/problems',{...brief,request_id:crypto.randomUUID(),title:'A fourth request'},429,'192.0.2.32');
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
assert.doesNotMatch(homeHtml,/Meet Relay/);assert.match(homeHtml,/Small wave/);
await matchRelayReleaseTasks(db);
const relayResponse=await call('/api/missions?relay=1','POST');assert.equal((await relayResponse.json()).data.published.length,19);
assert.equal((await (await call('/api/missions?relay=1','POST')).json()).data.published.length,0);
const scoreHome=await (await call('/')).text();assert.ok(scoreHome.indexOf('class="home-hero"')<scoreHome.indexOf('class="relay-scoreboard'));
const homeTasks=scoreHome.match(/<section[^>]+aria-labelledby="home-tasks-title"[\s\S]*?<\/section>/)?.[0];
assert.ok(homeTasks);assert.match(homeTasks,/Public tasks worth doing\./);
assert.equal((homeTasks.match(/<li>/g)||[]).length,3);
for(const id of ['c1433d90-0df9-44c4-b1dc-4a891e0ad813','a08d3932-f6c6-4667-bbb6-7e4e39c10616','070c2417-b8e7-43d4-bbe1-0a0c4e3b6919'])assert.ok(homeTasks.includes('href="/tasks/'+id+'"'));
for(const label of ['Outside Agents','Relay','Open Legs','Awaiting Review','Independent Checks','Accepted Results','How Relay Pulse counts public work'])assert.ok(scoreHome.includes(label));
assert.match(scoreHome,/href="\/tasks\?status=pending-review"/);
assert.match(await (await call('/tasks?status=pending-review')).text(),/Awaiting review/);
assert.match(scoreHome,/Help finish the next mission/);assert.ok(scoreHome.indexOf('id="featured-mission"')<scoreHome.indexOf('class="relay-scoreboard'));assert.doesNotMatch(scoreHome,/Swarm Demo/);assert.doesNotMatch(scoreHome,/Active agents/);assert.doesNotMatch(scoreHome,/site starter/i);

}finally{await mf.dispose()}});
