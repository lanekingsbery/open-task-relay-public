// Start ACCEPTED_CREDIT_FIXTURE=1 node tests/maintenance-preview.mjs after build.
// Uses only synthetic loopback records; aborts every outside request.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {creditFixture} from './accepted-credit-preview.mjs';
const {chromium}=await import(process.env.MAINTENANCE_BROWSER_MODULE||'playwright');
const base=process.env.MAINTENANCE_PUBLIC_URL||'http://127.0.0.1:4173';assert.equal(new URL(base).hostname,'127.0.0.1');
const out=process.env.CREDIT_SCREENSHOTS||'/tmp/otr-accepted-credit';mkdirSync(out,{recursive:true});
const report={scope:'Synthetic loopback browser QA',layouts:[],checks:[],errors:[],screenshots:[]};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
try{
 const context=await browser.newContext({viewport:{width:1366,height:960},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const screenshot=async name=>{await page.screenshot({path:out+'/'+name+'.png'});report.screenshots.push(name+'.png')};
 for(const width of [320,390,1366])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme});
  await page.goto(base+'/activity');await page.locator('.activity-list').waitFor();
  await page.evaluate(t=>{document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t},theme);
  const nav=page.getByRole('navigation',{name:'Activity filters'});
  assert.equal(await nav.locator('a').first().innerText(),'All activity');assert.equal(await nav.getByText('Site operations',{exact:true}).count(),0);
  assert.equal(await nav.locator('[aria-current="page"]').innerText(),'All activity');
  await page.getByRole('heading',{name:'Recent activity',exact:true}).waitFor();
  assert.match(await page.locator('.activity-list').innerText(),/Outside agent has posted/);
  assert.match(await page.locator('.activity-list').innerText(),/Relay.*candidate assembled/s);
  assert.match(await page.locator('.activity-list').innerText(),/Public maintenance completed/);
  assert.doesNotMatch(await page.locator('main').innerText(),/PRIVATE_BROWSER_SENTINEL/);
  await overflow();
  if(width===1366&&theme==='light'||width===390&&theme==='dark')await screenshot('activity-'+width+'-'+theme);
  const input=page.getByRole('searchbox',{name:'Search activity'});await input.focus();assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  await input.fill('Ancient needle');await input.press('Enter');await page.waitForURL(/search=Ancient/);
  await page.getByRole('heading',{name:'Search results',exact:true}).waitFor();
  assert.equal(await page.locator('.activity-record').count(),1);assert.match(await page.locator('.activity-record').innerText(),/2023|Ancient needle/);
  await overflow();if(width===390&&theme==='dark')await screenshot('history-search-mobile');
  for(const search of ['River researcher','handoff updated','Synthetic accepted work']){
   await page.goto(base+'/activity?search='+encodeURIComponent(search));await page.locator('.activity-record').first().waitFor();assert.ok(await page.locator('.activity-record').count()>0);
  }
  await page.goto(base);await page.locator('.accepted-gallery article').first().waitFor({state:'attached'});
  const articles=page.locator('.accepted-gallery article');assert.equal(await articles.count(),2);
  const known=articles.filter({hasText:'Synthetic accepted work:'}),unknown=articles.filter({hasText:'Synthetic legacy work:'});
  assert.match(await known.locator('.home-work-place').innerText(),/Local researcher/);assert.match(await known.locator('.home-work-place').innerText(),/River researcher/);
  assert.doesNotMatch(await known.locator('.home-work-place').innerText(),/Relay/);assert.doesNotMatch(await unknown.locator('.home-work-place').innerText(),/Relay|Local researcher|River researcher/);
  assert.match(await page.locator('.meet-relay').innerText(),/outside agents.*review and acceptance/s);
  for(let i=0;await known.getAttribute('hidden')!==null&&i<2;i++)await page.getByRole('button',{name:'Next accepted result'}).click();
  await overflow();if(width===1366&&theme==='light'||width===390&&theme==='dark')await screenshot('home-'+width+'-'+theme);
  const acceptedPath=await known.locator('h3 a').getAttribute('href');
  await page.goto(base+acceptedPath);await page.locator('.result-byline').waitFor();
  assert.match(await page.locator('.result-byline').innerText(),/Local researcher/);assert.match(await page.locator('.result-byline').innerText(),/River researcher/);assert.doesNotMatch(await page.locator('.result-byline').innerText(),/Relay/);
  await page.getByText('Technical details & original text',{exact:true}).click();assert.match(await page.locator('#technical-details .meta').first().innerText(),/Submitted by Relay/);
  await page.evaluate(()=>window.scrollTo(0,0));await overflow();if(width===1366&&theme==='light'||width===390&&theme==='dark')await screenshot('accepted-'+width+'-'+theme);
  await page.goto(base+'/tasks/'+acceptedPath.split('/').at(-1));await page.locator('.problem-deck').waitFor();
  assert.match(await page.locator('main').innerText(),/Work by Local researcher.*River researcher/s);assert.match(await page.locator('.current-state').innerText(),/Submitted by Relay/);await overflow();
  await page.goto(base+'/results/'+creditFixture.candidate);await page.getByText('Work by',{exact:false}).first().waitFor();assert.match(await page.locator('main').innerText(),/Work by Local researcher.*River researcher/s);await overflow();
  await page.goto(base+'/trophy-case/'+creditFixture.unknownTask);await page.locator('.result-byline').waitFor({state:'attached'});assert.doesNotMatch(await page.locator('.result-byline').innerText(),/By Relay/);await overflow();
  await page.goto(base+'/receipts/'+creditFixture.candidate);await page.getByRole('heading',{name:'OTR Accepted Contributor',exact:true}).waitFor();assert.match(await page.locator('main > p').allTextContents().then(a=>a.join(' ')),/By Local researcher.*River researcher/);await overflow();
  report.layouts.push({width,theme,overflow:false,credit:true,historySearch:true});
 }
 await page.goto(base+'/activity');const firstIds=await page.locator('.activity-record').evaluateAll(a=>a.map(e=>e.id));assert.equal(firstIds.length,60);
 const visited=[];let pages=0;
 for(;;){pages++;visited.push(...await page.locator('.activity-record').evaluateAll(a=>a.map(e=>e.id)));const next=page.locator('a[rel="next"]');if(!await next.count())break;assert.ok(pages<20);const href=await next.getAttribute('href');await page.goto(base+href);await page.locator('.activity-list').waitFor();}
 assert.equal(visited.length,new Set(visited).size);assert.ok(visited.some(id=>id.endsWith('browser-old-message')));assert.deepEqual(visited.slice(0,60),firstIds);
 report.checks.push('All activity is primary; newest page contains outside messages, Relay assembly and public maintenance. Hidden discussion is absent.');
 report.checks.push('Full-history search by agent, task and action; 2023 message found beyond the newest page; keyboard form submission.');
 report.checks.push(`Browsed ${visited.length} distinct records across ${pages} cursor pages; no repeated records; oldest outside message reachable.`);
 report.checks.push('Multiple outside contributors on gallery, task, result, accepted bundle and receipt; Relay retains Submitted by provenance; legacy record has no fallback byline.');
 assert.deepEqual(report.errors,[]);await context.close();
}finally{writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));await browser.close()}
console.log(JSON.stringify(report,null,2));
