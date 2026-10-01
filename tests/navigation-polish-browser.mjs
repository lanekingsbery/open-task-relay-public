// Focused PR #87 regression QA. Start tests/maintenance-preview.mjs after build.
// Synthetic loopback records and provider image responses; never production writes.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {HOME_BADGES,SOURCE_BADGES,DISCOVERY_LISTINGS} from '../lib/project-links.ts';
const {chromium}=await import(process.env.MAINTENANCE_BROWSER_MODULE||'playwright');
const base=process.env.MAINTENANCE_PUBLIC_URL||'http://127.0.0.1:4173';
const fixture=process.env.MAINTENANCE_FIXTURE_URL||'http://127.0.0.1:4174/tests/fixtures/maintenance/';
for(const url of [base,fixture])assert.equal(new URL(url).hostname,'127.0.0.1');
const out=process.env.NAVIGATION_SCREENSHOTS||'/tmp/otr-navigation-polish';mkdirSync(out,{recursive:true});
const sources=new Set([...HOME_BADGES,...SOURCE_BADGES,...DISCOVERY_LISTINGS.flatMap(l=>l.badge?[l.badge]:[])].map(b=>b.src).filter(s=>s.startsWith('https://')));
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="180" height="40"><rect width="180" height="40" fill="#167348"/><text x="10" y="25" fill="white">Synthetic provider badge</text></svg>';
const report={scope:'Loopback-only synthetic browser verification; provider responses mocked',layouts:[],checks:[],errors:[],screenshots:[]};
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
let earlyFailure=false;
async function routing(context){await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url());
 if(url.hostname==='127.0.0.1'){
  // Ensure the eager failed image finishes before hydration scripts execute.
  if(earlyFailure&&request.resourceType()==='script')await new Promise(resolve=>setTimeout(resolve,750));
  return route.continue();
 }
 if(request.resourceType()==='image'&&sources.has(request.url()))return route.fulfill(earlyFailure&&url.hostname==='glama.ai'?{status:404,body:'Missing fixture badge'}:{status:200,contentType:'image/svg+xml',body:svg});
 return route.abort();
})}
async function badges(page,failed=false){
 const list=page.locator('.discovery-listings');await list.first().waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.discovery-listings img')].every(el=>el.complete&&el.naturalWidth>0));
 assert.equal(await list.getByText('Badge unavailable',{exact:true}).count(),failed?1:0);
 assert.equal(await page.getByText('Creator ORCID',{exact:true}).count(),0);
 if(failed)for(const link of await list.locator('a').filter({hasText:'Badge unavailable'}).all())assert.match(await link.getAttribute('href'),/^https:\/\/glama.ai\//);
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
try{
 const context=await browser.newContext({viewport:{width:1366,height:960},reducedMotion:'reduce'});await routing(context);
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of [320,390,1366])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await page.goto(base);await page.locator('h1').waitFor();await page.evaluate(t=>{document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t},theme);
  const mobile=width<850,trigger=page.getByRole('button',{name:mobile?'Menu':'For agents',exact:true});await trigger.focus();await page.keyboard.press('Enter');
  const nav=page.locator(mobile?'#mobile-navigation':'#navigation-agents');
  const links=mobile?nav.locator('div').last().locator('a'):nav.locator('a');
  assert.equal(await links.count(),7);assert.equal(await links.locator('.nav-ai-label').count(),7);
  const colors=await links.locator('.nav-ai-label').evaluateAll(tags=>tags.map(t=>[getComputedStyle(t).color,getComputedStyle(t).backgroundColor]));assert.ok(colors.every(c=>JSON.stringify(c)===JSON.stringify(colors[0])));
  assert.equal(await page.locator('#navigation-more a[href="/rooms"],#navigation-more a[href="/messages"]').count(),0);
  await noOverflow(page);await page.screenshot({path:out+`/menu-${width}-${theme}.png`});report.screenshots.push(`menu-${width}-${theme}.png`);
  await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  const documents=[];page.on('request',r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documents.push(r.url())});
  await page.getByRole('button',{name:mobile?'Menu':'More',exact:true}).click();await page.locator(mobile?'#mobile-navigation':'#navigation-more').getByRole('link',{name:'Around the web',exact:true}).click();await page.waitForURL(/around-the-web/);await badges(page);assert.equal(documents.length,0,'Internal navigation preserves the original document and its CSP');
  await page.reload();await badges(page);await noOverflow(page);
  report.layouts.push({width,theme,menu:true,clientNavigationBadges:true,coldReloadBadges:true,overflow:false});
 }
 report.checks.push('Seven identical AI tags on mobile/desktop; keyboard activation, Escape/focus return; CSP-enforced cold and internal navigation badge loads at 320/390/1366 light/dark.');
 earlyFailure=true;await page.goto(base+'/around-the-web');await badges(page,true);earlyFailure=false;
 report.checks.push('Provider image fails before delayed hydration; fallback text and provider links survive.');
 await page.goto(base);await page.locator('.pulse-metric').filter({hasText:'Community agents'}).waitFor();
 const pulse=await page.locator('.pulse-metric').filter({hasText:'Community agents'}).locator('dd').innerText();
 await page.goto(base+'/adoption');const registration=await page.locator('.stat').filter({hasText:'Community agents'}).locator('strong').innerText();assert.equal(pulse,registration);
 report.checks.push('Participation and Relay Pulse use identical synthetic registration counts.');
 await context.close();
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});await routing(touch);
 const phone=await touch.newPage();phone.on('pageerror',e=>report.errors.push(e.message));await phone.clock.install();await phone.goto(fixture+'?surface=gallery');
 const gallery=phone.locator('.accepted-gallery'),position=gallery.locator('.gallery-controls span'),body=gallery.locator('.gallery-body');await gallery.waitFor();await gallery.scrollIntoViewIfNeeded();await phone.mouse.move(0,800);
 assert.equal(await gallery.getByRole('button',{name:/Play|Pause|rotation/}).count(),0);
 const read=()=>position.innerText(),advance=async()=>{const before=await read();await phone.clock.runFor(15001);assert.notEqual(await read(),before)};
 await advance();
 await gallery.getByRole('button',{name:'Next accepted result'}).click();const next=await read();await phone.clock.runFor(16000);assert.equal(await read(),next,'Focus pauses');
 await phone.getByRole('button',{name:'Add synthetic accepted work'}).focus();await phone.mouse.move(0,800);await advance();
 const beforePrevious=await read();await gallery.getByRole('button',{name:'Previous accepted result'}).click();assert.notEqual(await read(),beforePrevious);await phone.getByRole('button',{name:'Add synthetic accepted work'}).focus();await phone.mouse.move(0,800);
 await body.dispatchEvent('pointerdown',{pointerType:'touch',clientX:200,clientY:150});const held=await read();await phone.clock.runFor(16000);assert.equal(await read(),held);
 await phone.locator('main > p').dispatchEvent('pointerup',{pointerType:'touch',clientX:200,clientY:30});await advance();
 await body.dispatchEvent('pointerdown',{pointerType:'touch',clientX:200,clientY:150});await phone.locator('main > p').dispatchEvent('pointercancel',{pointerType:'touch'});await advance();
 await body.dispatchEvent('pointerdown',{pointerType:'touch',clientX:200,clientY:150});await phone.evaluate(()=>window.dispatchEvent(new Event('blur')));await advance();
 await phone.getByRole('button',{name:'Add synthetic accepted work'}).click();assert.match(await read(),/\/ 4$/);await phone.clock.runFor(15001);
 const seen=new Set();for(let i=0;i<4;i++){seen.add(await gallery.locator('article:not([hidden]) h3').innerText());await gallery.getByRole('button',{name:'Next accepted result'}).click()}assert.ok(seen.has('New synthetic accepted work'));
 await phone.getByRole('button',{name:'Add synthetic accepted work'}).focus();await phone.mouse.move(0,800);await phone.emulateMedia({reducedMotion:'reduce'});await new Promise(resolve=>setTimeout(resolve,100));await phone.clock.runFor(100);const reduced=await read();await phone.clock.runFor(31000);assert.equal(await read(),reduced,'Reduced motion pauses');
 await phone.emulateMedia({reducedMotion:'no-preference'});await new Promise(resolve=>setTimeout(resolve,100));await phone.clock.runFor(100);await advance();
 await body.hover();const hovered=await read();await phone.clock.runFor(16000);assert.equal(await read(),hovered);await phone.mouse.move(0,800);await advance();
 await phone.evaluate(()=>{const spacer=document.createElement('div');spacer.style.height='1600px';document.body.append(spacer);window.scrollTo(0,1400)});await phone.waitForFunction(()=>document.querySelector('.accepted-gallery').getBoundingClientRect().bottom<0);await new Promise(resolve=>setTimeout(resolve,100));await phone.clock.runFor(100);const offscreen=await read();await phone.clock.runFor(16000);assert.equal(await read(),offscreen);await gallery.scrollIntoViewIfNeeded();await new Promise(resolve=>setTimeout(resolve,100));await phone.clock.runFor(100);await advance();
 await phone.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});const hidden=await read();await phone.clock.runFor(16000);assert.equal(await read(),hidden);await phone.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await advance();
 // Real Chromium touch input, including swipe suppression of link clicks.
 const cdp=await touch.newCDPSession(phone),box=await body.boundingBox();await gallery.scrollIntoViewIfNeeded();const initial=await read(),x=box.x+box.width*.8,y=box.y+20;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-100,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await read(),initial);assert.ok(phone.url().includes('surface=gallery'));
 await phone.screenshot({path:out+'/gallery-mobile.png'});report.screenshots.push('gallery-mobile.png');await phone.setViewportSize({width:1366,height:960});await phone.screenshot({path:out+'/gallery-desktop.png'});report.screenshots.push('gallery-desktop.png');
 report.checks.push('Gallery arrows, 15-second rotation, focus/hover/touch/offscreen/document-visibility pauses, outside touch release/cancel/window-blur recovery, reduced motion, new snapshot inclusion and real touch swipe.');
 await touch.close();assert.deepEqual(report.errors,[]);
}finally{writeFileSync(out+'/review-report.json',JSON.stringify(report,null,2));await browser.close()}
console.log(JSON.stringify(report,null,2));
