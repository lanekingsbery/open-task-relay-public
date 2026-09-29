// Optional browser QA using an already-installed Playwright runtime. No model or
// production endpoints. Start maintenance-preview.mjs after building the app.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.MAINTENANCE_BROWSER_MODULE||'playwright');
const fixture=process.env.MAINTENANCE_FIXTURE_URL||'http://127.0.0.1:4174/tests/fixtures/maintenance/';
const publicURL=process.env.MAINTENANCE_PUBLIC_URL||'http://127.0.0.1:4173';
for(const url of [fixture,publicURL])assert.equal(new URL(url).hostname,'127.0.0.1','QA is loopback-only');
const out=process.env.MAINTENANCE_SCREENSHOTS||'/tmp/otr-maintenance-screenshots';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const task={id:'11111111-1111-4111-8111-111111111111',title:'Synthetic older task: compare dated public source definitions and explain remaining uncertainty',revision:1,expected_output:'A cited comparison with remaining uncertainty.',next_action:'Read one public definition and record its date.',next_action_sources:['https://example.org/source'],acceptance_criteria:['Cite both dated definitions'],relay_leg:{next_action:'Compare dated sources',source_urls:['https://example.org/source'],useful_progress:'Record one source definition',max_minutes:5}};
const assessment={outcome:'needs_synthesis',summary:'The corrected claim needs a complete, cited synthesis. '+('A long but readable synthetic assessment. '.repeat(10)),missing:['A final comparison covering every criterion'],next_action:'Compare the dated definitions and record one specific uncertainty.',source_reads:[{readable:true}]};
const candidate={id:task.id,title:task.title,result_id:'22222222-2222-4222-8222-222222222222',revision:1,assessment_status:'complete',assessment_revision:1,assessment_at:Date.parse('2026-09-28T12:00:00Z'),error_code:null,assessment,task};
const moderation={resolution_candidates:[candidate],editable:[],editable_page:2,editable_search:'older',editable_has_next:false,editable_selection:task,messages:[],agents:[],agent_actions:[],stale_premises:[],comments:[],comment_actions:[],tasks:[],reviewable:[],owner_verification_failures:[],privacy_requests:[],notifications:[],reports:[]};
const request={id:'33333333-3333-4333-8333-333333333333',revision:2,status:'DRAFT',reason:'Owner reviewed this synthetic proposal.',created_at:Date.parse('2026-09-28T12:00:00Z'),draft_hash:'f'.repeat(64),draft_json:JSON.stringify(task),input_json:JSON.stringify({title:task.title,objective:'Compare the two definitions.',beneficiary:'People interpreting public data.',next_action:task.next_action,expected_output:task.expected_output,acceptance_criteria:task.acceptance_criteria}),assessment_json:JSON.stringify({assessment:{assessment:assessment.summary}}),task_id:null};
const operator={offset:50,next_offset:100,control:{enabled:1,revision:1},source_version:'b'.repeat(40),requests:[request],followups:[],receipts:[],health:null,limits:{daily_publication_limit:1}};
const report={checks:[],screenshots:[]};
try{
 const context=await browser.newContext({viewport:{width:1280,height:960}});
 await context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'?route.continue():route.abort()});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(fixture).origin});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let mode='normal',posts=[],loads=[];
 await page.route('**/api/moderation/relay*',async route=>{
  if(route.request().method()==='POST'){posts.push(route.request().postData());if(posts.length===1)return route.abort('failed');return route.fulfill({json:{data:{status:'DRAFT'}}})}
  loads.push(route.request().url());if(mode==='error')return route.fulfill({status:503,json:{error:{message:'Synthetic load failure'}}});
  if(mode==='loading')await new Promise(r=>setTimeout(r,1000));return route.fulfill({json:{data:mode==='empty'?{...operator,requests:[],followups:[]}:operator}});
 });
 await page.route('**/api/moderation?*',route=>route.fulfill({json:{data:moderation}}));
 await page.route('**/api/moderation',route=>route.fulfill({json:{data:moderation}}));
 await page.route('**/api/task-requests',route=>route.fulfill({json:{data:{status:'PUBLISHED',reason:'Synthetic publication receipt.',task_id:task.id}}}));
 const go=async surface=>{await page.goto(fixture+'?surface='+surface);await page.getByRole('heading',{level:1}).or(page.getByText('Synthetic local fixture',{exact:true})).first().waitFor()};
 await go('resolution');await page.getByRole('button',{name:'complete',exact:true}).click();
 const next=page.getByLabel('Suggested public next step');await next.waitFor();assert.match(await next.inputValue(),/cited synthesis/);
 await next.fill('Owner unsaved edit: check the dated source and retain uncertainty.');await page.getByRole('button',{name:'New assessment',exact:true}).click();assert.match(await next.inputValue(),/^Owner unsaved edit/);await page.getByText('The assessment changed;', {exact:false}).waitFor();
 await page.getByRole('button',{name:'Use latest assessment suggestion'}).click();assert.match(await next.inputValue(),/Revision 2/);
 await page.getByRole('button',{name:'Toggle task availability'}).click();await page.getByText('Current task data is unavailable.',{exact:false}).waitFor();assert.equal(await page.getByText('Stale assessment:',{exact:false}).count(),0);
 await page.getByRole('button',{name:'Toggle task availability'}).click();await page.getByText('Stale assessment:',{exact:false}).waitFor();
 for(const state of ['pending','running','deferred','failed']){await page.getByRole('button',{name:state,exact:true}).click();await page.getByRole('status').filter({hasText:new RegExp('^'+state,'i')}).waitFor()}
 report.checks.push('Assessment completion after mount populates editor; unsaved owner edits survive assessment changes; unavailable and stale differ; all six lifecycle states render.');
 await page.goto(fixture+'?surface=operator&offset=50');await page.getByRole('button',{name:'Prepare reviewed draft'}).waitFor();
 await page.getByLabel('I checked the sources, public benefit, duplicates, and safe scope of this draft.').check();await page.getByRole('button',{name:'Prepare reviewed draft'}).click();await page.getByRole('button',{name:'Retry saved decision'}).waitFor();
 await page.getByRole('button',{name:'Refresh current page'}).click();await page.getByRole('button',{name:'Retry saved decision'}).click();await page.getByRole('status').filter({hasText:'Decision confirmed.'}).waitFor();
 assert.equal(posts.length,2);assert.equal(posts[0],posts[1]);assert.ok(loads.every(url=>url.endsWith('offset=50')));assert.equal(new URL(page.url()).searchParams.get('offset'),'50');assert.equal(await page.getByRole('alert').count(),0);
 report.checks.push('Lost decision response retries identical key/payload, survives refresh, keeps offset 50, and clears recovered errors.');
 await go('request');assert.equal(await page.locator('option[value="promotion"],option[value="transaction"]').count(),0);await page.getByLabel('Private status key',{exact:true}).fill('a'.repeat(64));await page.getByRole('button',{name:'Copy status key',exact:true}).click();await page.getByText('Status key copied.').waitFor();await page.getByRole('button',{name:'Check status',exact:true}).click();await page.getByRole('link',{name:'View published task'}).waitFor();assert.ok((await page.getByRole('link',{name:'View published task'}).getAttribute('href')).startsWith('/tasks/'));assert.equal(new URL(page.url()).searchParams.has('request_key'),false);report.checks.push('Public receipt renders task/status links, key copy control, and excludes prohibited purpose options.');
 const publicTasks=await (await fetch(publicURL+'/api/v1/tasks')).json();const sample=publicTasks.data.items.find(t=>t.title.startsWith('Fixture'));
 assert.ok(sample);
 const accepted=(await (await fetch(publicURL+'/api/solved')).json()).data.items[0];assert.ok(accepted);
 await page.goto(publicURL+'/tasks?search=Fixture&status=all&sort=newest&page=2');
 const previous=page.getByRole('link',{name:'← Previous tasks'});await previous.waitFor();const previousURL=new URL(await previous.getAttribute('href'),publicURL);
 for(const [key,value] of [['search','Fixture'],['status','all'],['sort','newest'],['page','1']])assert.equal(previousURL.searchParams.get(key),value);
 await page.getByLabel('Search tasks',{exact:true}).fill('Fixture 000:');await page.getByRole('button',{name:'Apply filters',exact:true}).first().click();await page.waitForURL(url=>url.searchParams.get('search')==='Fixture 000:');
 await page.locator('.board-row').first().waitFor();assert.equal(await page.locator('.board-row').count(),1);assert.equal(new URL(page.url()).searchParams.has('page'),false);
 await page.goto(publicURL+'/tasks/'+sample.id);await page.locator('.work-entry').waitFor();assert.equal(await page.locator('.work-entry').evaluateAll(items=>items.some(el=>Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()==='0'))),false);
 report.checks.push('Search runs across the inventory before pagination, preserves URL filters/sort, resets page on submit, and outside contributions render no stray zero text nodes.');
 const surfaces=[['board',publicURL+'/tasks'],['task',publicURL+'/tasks/'+sample.id],['accepted',publicURL+'/tasks?status=solved'],['evidence',publicURL+'/trophy-case/'+accepted.id],['request',publicURL+'/task-requests'],['moderation',fixture+'?surface=moderation&editable_page=2&editable_search=older'],['operator',fixture+'?surface=operator&offset=50']];
 for(const width of [1280,375,390])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  for(const [name,url] of surfaces){await page.goto(url);await page.locator('main').waitFor();if(name==='moderation')await page.getByRole('heading',{name:task.title,exact:true}).waitFor();if(name==='operator')await page.getByRole('button',{name:'Prepare reviewed draft'}).waitFor();await page.evaluate(theme=>{document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.style.colorScheme=theme},theme);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${name} ${width} ${theme} horizontal overflow`);
   const target=page.locator('main input:not([type=hidden]),main textarea,main button,main a').filter({visible:true}).first();if(await target.count()){await target.focus();await page.keyboard.press('Tab');const focused=page.locator(':focus');assert.equal(await focused.count(),1);assert.notEqual(await focused.evaluate(el=>getComputedStyle(el).outlineStyle),'none',`${name} keyboard focus`)}
   const filename=`${name}-${width}-${theme}.png`;await page.screenshot({path:out+'/'+filename,fullPage:name!=='board'});report.screenshots.push(filename);
  }
 }
 for(const state of ['empty','error','loading']){mode=state;await page.goto(fixture+'?surface=operator&offset=50');if(state==='error')await page.getByRole('alert').waitFor();else if(state==='empty')await page.getByText('No requests on this page.').waitFor();else await page.getByText('Loading operations…').waitFor();await page.screenshot({path:out+'/operator-'+state+'.png',fullPage:true})}
 mode='normal';await page.getByRole('button',{name:'Refresh current page'}).click();await page.getByRole('button',{name:'Prepare reviewed draft'}).waitFor();assert.equal(await page.getByRole('alert').count(),0);
 assert.deepEqual(errors,[]);report.checks.push('Desktop 1280 and mobile 375/390 in light/dark: no horizontal overflow; visible keyboard focus; empty, loading, error, recovery and long-content owner states.');
 writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
