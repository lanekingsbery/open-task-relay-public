// S01–S12: local built-page journeys. All browser traffic is confined to loopback.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.MAINTENANCE_BROWSER_MODULE||'playwright');
const base=process.env.MAINTENANCE_PUBLIC_URL||'http://127.0.0.1:4173';
assert.equal(new URL(base).hostname,'127.0.0.1');
const out=process.env.SIMPLICITY_SCREENSHOTS||'/tmp/otr-simplicity-evidence';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const report={checks:[],screenshots:[],pages:[],journeys:[]};
try{
 const context=await browser.newContext({viewport:{width:1366,height:960},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await context.request.get(base+'/api/v1/tasks?limit=100'),tasks=(await response.json()).data.items;
 const task=tasks.find(t=>t.title.startsWith('Fixture 104:')),accepted=tasks.find(t=>t.title.startsWith('Synthetic accepted work:'));
 assert.ok(task&&accepted,'Run maintenance-preview with UI_AUDIT_FIXTURE=1');
 const go=async(path,theme='light')=>{await page.goto(base+path);await page.locator('main').waitFor();await page.evaluate(t=>{document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t},theme)};
 const screenshot=async(name,fullPage=true)=>{await page.screenshot({path:out+'/'+name+'.png',fullPage});report.screenshots.push(name+'.png')};
 const noOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' horizontal overflow');
 // Primary keyboard paths and explicit menu activation.
 await go('/');
 const more=page.getByRole('button',{name:'More',exact:true});await more.focus();assert.equal(await more.getAttribute('aria-expanded'),'false');
 await page.keyboard.press('Enter');assert.equal(await more.getAttribute('aria-expanded'),'true');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'About');
 await page.keyboard.press('Escape');assert.equal(await more.getAttribute('aria-expanded'),'false');assert.equal(await more.evaluate(el=>el===document.activeElement),true);
 await more.click();await page.locator('h1').click();assert.equal(await more.getAttribute('aria-expanded'),'false');
 const agents=page.getByRole('button',{name:'For agents',exact:true});await agents.click();assert.equal(await page.locator('#navigation-agents a').count(),5);await page.keyboard.press('Escape');
 await go('/tasks');await more.click();await page.locator('.desktop-navigation').getByRole('link',{name:'Accepted work',exact:true}).click();await page.waitForURL(/status=solved/);assert.equal(await more.getAttribute('aria-expanded'),'false');await go('/');
 report.checks.push('Desktop menus: focus alone does not open; Enter, Tab, Escape, outside click, expanded state and focus return work.');
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++});
 assert.equal(await page.getByRole('button',{name:'Relay shortcuts'}).count(),0);
 await page.getByRole('button',{name:'Copy prompt',exact:true}).click();await page.getByRole('status').filter({hasText:'Prompt copied to clipboard.'}).waitFor();
 const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(copied.includes('30 seconds to 5 minutes'));assert.ok(copied.includes('Not published'));assert.ok(copied.includes('/api/reviews?kind=completion'));
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Synthetic clipboard failure')}}});document.execCommand=()=>false});
 await page.getByRole('button',{name:'Copied!',exact:true}).click();await page.getByRole('status').filter({hasText:'Copy failed.'}).waitFor();assert.equal(await page.getByLabel('AI prompt for manual copying').isVisible(),true);assert.equal(await page.getByRole('button',{name:'Copy prompt',exact:true}).isVisible(),true);
 assert.equal(posts,0);report.checks.push('Homepage shortcuts are absent; copy reports success only after clipboard confirmation, preserves prompt limits, and exposes manual recovery on failure.');
 report.journeys.push('Copy AI prompt: one explicit action, clipboard contents checked; failure can be recovered by copying visible text.');
 await go('/');await page.getByRole('button',{name:'How does this work?',exact:true}).click();assert.equal(posts,0);assert.equal(await page.getByLabel('Message Relay').inputValue(),'How does Open Task Relay work?');
 await page.route('**/api/relay/chat',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.getByRole('button',{name:'Send message',exact:true}).click();await page.locator('.relay-answer').waitFor();assert.equal(await page.getByRole('link',{name:'Browse tasks',exact:true}).isVisible(),true);
 report.checks.push('Chat starter only fills input; explicit send with local 503 returns fallback while browsing/copy remain available.');
 // A short board window, URL-based filters, and exact next/previous continuity.
 await go('/tasks');assert.equal(await page.locator('.board-row').count(),18);
 const controls=page.locator('.board-filter-primary input:not([type=hidden]),.board-filter-primary select,.board-filter-primary button');assert.equal(await controls.count(),3);
 await controls.first().focus();for(let i=0;i<3;i++){assert.equal(await controls.nth(i).evaluate(el=>el===document.activeElement),true);assert.notEqual(await controls.nth(i).evaluate(el=>getComputedStyle(el).outlineStyle),'none');if(i<2)await page.keyboard.press('Tab')}
 const firstTitles=await page.locator('.board-row h2').allTextContents();await page.getByRole('link',{name:'Next tasks →'}).click();await page.waitForURL(/page=2/);await page.locator('.board-row').first().waitFor();assert.ok(new URL(page.url()).searchParams.get('page')==='2');const nextTitles=await page.locator('.board-row h2').allTextContents();assert.equal(nextTitles.some(t=>firstTitles.includes(t)),false);await page.getByRole('link',{name:'← Previous tasks'}).click();await page.waitForURL(/page=1/);await page.locator('.board-row').first().waitFor();assert.deepEqual(await page.locator('.board-row h2').allTextContents(),firstTitles);
 await page.getByText('More topics',{exact:true}).click();const topic=page.locator('.topic-chips a').filter({hasText:'Humanitarian & public-interest research'});await topic.click();await page.waitForURL(/category=/);await page.locator('.topic-chips [aria-current=page]').filter({hasText:'Humanitarian'}).waitFor();assert.ok(new URL(page.url()).searchParams.get('category'));assert.equal(await topic.getAttribute('aria-current'),'page');await page.getByRole('link',{name:'Clear topic',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('category'));assert.equal(new URL(page.url()).searchParams.has('category'),false);
 await go('/tasks?category=science&minutes=5&status=open&search=rainfall');const href=await page.locator('.topic-chips a').filter({hasText:'History'}).getAttribute('href');assert.ok(href.includes('minutes=5')&&href.includes('status=open')&&href.includes('search=rainfall'));assert.ok(!href.includes('page='));
 report.checks.push('18-card server pages have no overlap; Previous restores records; topic chips select/clear existing URL filters and preserve search/work/time queries. Keyboard order matches visual filter order.');
 report.journeys.push('Choose a task: Browse tasks → scan 18 cards → topic filter → task requirements; URLs preserve choices.');
 await go('/tasks?status=solved');await page.locator('a[href="/trophy-case/'+accepted.id+'"]').first().click();await page.getByRole('heading',{name:'Findings',exact:true}).waitFor();assert.equal(await page.locator('.readable-result').first().isVisible(),true);assert.equal(await page.locator('.result-source-links').isVisible(),true);
 await page.getByRole('link',{name:'Sources',exact:true}).click();assert.equal(await page.locator('#sources-title').isVisible(),true);await page.getByRole('link',{name:'Review record',exact:true}).click();assert.equal(await page.locator('#verification-title').isVisible(),true);
 report.checks.push('Accepted result shows authored findings and sources; Sources/Review record fragments reveal disclosures.');report.journeys.push('Understand an accepted result: Accepted work → findings → nearby sources/limitations → expandable review record.');
 const routes=[['home','/'],['tasks','/tasks'],['accepted','/tasks?status=solved'],['task','/tasks/'+task.id],['result','/trophy-case/'+accepted.id],['receipt','/receipts/'+accepted.accepted_result_id],['source','/source'],['agents','/agent-guide'],['suggest','/task-requests'],['activity','/activity'],['about','/about'],['privacy','/privacy'],['security','/security']];
 for(const width of [390,768,1366])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  for(const [name,path] of routes){await go(path,theme);if(name==='receipt')assert.ok(await page.locator('section img').evaluate(el=>el.complete&&el.naturalWidth>0),'Receipt badge preview loads from this origin');await noOverflow(name+' '+width+' '+theme);await screenshot(name+'-'+width+'-'+theme,['home','source','agents','about'].includes(name));report.pages.push({name,width,theme,overflow:false});
   if(name==='source'||name==='about'){const words=await page.locator('main').evaluate(el=>el.innerText.split(/\s+/).filter(Boolean).length);report.pages.at(-1).visibleWords=words;if(name==='source')assert.ok(words>=150&&words<=250,'Source words '+words);if(name==='about')assert.ok(words>=150&&words<=220,'About words '+words)}
  }
  await go('/',theme);
  if(width<850){const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');await noOverflow('Menu '+width+' '+theme);await screenshot('menu-'+width+'-'+theme,false);assert.equal(await page.locator('#mobile-navigation a').count(),10);await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(el=>el===document.activeElement),true)}
 }
 // Actual touch events, not just a narrow desktop viewport.
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});await touch.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const phone=await touch.newPage();await phone.goto(base);const menu=phone.getByRole('button',{name:'Menu',exact:true});await menu.tap();assert.equal(await menu.getAttribute('aria-expanded'),'true');await phone.locator('#mobile-navigation').getByRole('link',{name:'Tasks',exact:true}).tap();await phone.locator('.board-row').first().waitFor();await touch.close();
 report.checks.push('All changed page groups fit 390/768/1366 light/dark with reduced motion; mobile Menu supports touch, Escape and focus return.');
 assert.deepEqual(errors,[]);await context.close();
}finally{writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close()}
console.log(JSON.stringify(report,null,2));
