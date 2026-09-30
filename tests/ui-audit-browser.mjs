// Focused loopback-only UI recovery and breakpoint checks. Uses an externally
// installed Playwright runtime, without changing application dependencies.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {runModerationChecks} from './ui-audit-moderation.mjs';
import {runPrivateChecks} from './ui-audit-private.mjs';
import {runReviewChecks} from './ui-audit-review.mjs';
const {chromium}=await import(process.env.MAINTENANCE_BROWSER_MODULE||'playwright');
const fixture=process.env.UI_AUDIT_FIXTURE_URL||'http://127.0.0.1:4174/tests/fixtures/ui-audit/';
const publicURL=process.env.MAINTENANCE_PUBLIC_URL||'http://127.0.0.1:4173';
for(const url of [fixture,publicURL])assert.equal(new URL(url).hostname,'127.0.0.1','QA must stay on loopback');
const out=process.env.UI_AUDIT_SCREENSHOTS||'/tmp/otr-ui-audit-evidence';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={checks:[],screenshots:[],contrast:[]};
function contrast(foreground,background){
 const lum=rgb=>{const c=rgb.match(/[\d.]+/g).slice(0,3).map(n=>{const v=Number(n)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};
 const [a,b]=[lum(foreground),lum(background)].sort((x,y)=>y-x);return (a+.05)/(b+.05);
}
try{
 const tasks=await (await fetch(publicURL+'/api/v1/tasks')).json();
 const taskId=tasks.data.items.find(t=>t.title.startsWith('Fixture 104:'))?.id;
 assert.ok(taskId,'Start maintenance-preview with UI_AUDIT_FIXTURE=1');
 const args={browser,fixture,publicURL,out,report,taskId,latestResultId:'77777777-7777-4777-8777-777777777777',olderResultId:'66666666-6666-4666-8666-666666666666',latestReviewId:'88888888-8888-4888-8888-888888888888'};
 await runModerationChecks(args);await runPrivateChecks(args);await runReviewChecks(args);
 const context=await browser.newContext({viewport:{width:1366,height:960},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(fixture).origin});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const screenshot=async name=>{const filename=name+'.png';await page.screenshot({path:out+'/'+filename,fullPage:!name.startsWith('board-')&&!name.startsWith('candidate-')});report.screenshots.push(filename)};
 const themePage=async(url,theme)=>{await page.goto(url);await page.locator('main').waitFor();await page.evaluate(t=>{document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t},theme)};
 const noOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
 for(const width of [390,768,1366])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await themePage(publicURL+'/tasks',theme);await noOverflow(`Board ${width} ${theme}`);
  const controls=page.locator('.board-filter-primary input,.board-filter-primary select,.board-filter-primary button');
  assert.equal(await controls.count(),4);
  await controls.first().focus();
  const boxes=[];
  for(let i=0;i<4;i++){
   const control=controls.nth(i);assert.equal(await control.evaluate(el=>el===document.activeElement),true,'Filter keyboard order');
   assert.notEqual(await control.evaluate(el=>getComputedStyle(el).outlineStyle),'none','Visible filter focus');
   const box=await control.boundingBox();boxes.push(box);
   if(i>0){const prior=boxes[i-1];assert.ok(box.y>=prior.y-2,'Filter visual order must follow DOM');if(Math.abs(box.y-prior.y)<2)assert.ok(box.x>prior.x,'Same-row filter order')}
   if(i<3)await page.keyboard.press('Tab');
  }
  await screenshot(`board-${width}-${theme}`);
  await themePage(fixture+'?surface=prompt',theme);const button=page.getByRole('button',{name:'Copy prompt',exact:true});
  for(const state of ['normal','hover','focus','active']){
   await page.mouse.move(0,0);await button.evaluate(el=>el.blur());
   if(state==='hover'||state==='active')await button.hover();
   if(state==='focus')await button.focus();
   if(state==='active')await page.mouse.down();
   const colors=await button.evaluate(el=>{const c=getComputedStyle(el);return {foreground:c.color,background:c.backgroundColor,outline:c.outlineStyle}});
   const ratio=contrast(colors.foreground,colors.background);assert.ok(ratio>=4.5,`${theme} ${state} contrast ${ratio}`);
   if(state==='focus')assert.notEqual(colors.outline,'none');
   report.contrast.push({theme,width,state,...colors,ratio:Number(ratio.toFixed(3))});
   if(state==='active')await page.mouse.up();
  }
  await button.click();await page.getByRole('status').filter({hasText:'Prompt copied to clipboard.'}).waitFor();
  await noOverflow(`Prompt ${width} ${theme}`);await screenshot(`prompt-${width}-${theme}`);
  await themePage(publicURL+'/tasks/'+taskId,theme);await page.locator('#result-'+args.latestResultId).waitFor();await noOverflow(`Task ${width} ${theme}`);
  await screenshot(`candidate-${width}-${theme}`);
  await page.locator('.current-state').getByRole('link',{name:'Inspect latest candidate →'}).click();
  assert.ok(page.url().endsWith('#result-'+args.latestResultId));
  const candidateTop=await page.locator('#result-'+args.latestResultId).evaluate(el=>el.getBoundingClientRect().top);assert.ok(candidateTop>=-2&&candidateTop<960,'Candidate jump reaches exact result');
  if((width===390&&theme==='dark')||(width===1366&&theme==='light')){const name=`latest-evidence-${width}-${theme}.png`;await page.locator('.work-history').screenshot({path:out+'/'+name});report.screenshots.push(name)}
  await themePage(fixture+'?surface=request',theme);await noOverflow(`Request ${width} ${theme}`);await screenshot(`request-${width}-${theme}`);
 }
 assert.deepEqual(errors,[]);await context.close();
 report.checks.push('F08: rendered normal/hover/focus/active copy-button contrast meets 4.5:1 in both themes; focus and copied announcement preserved.');
 report.checks.push('F09: keyboard and visual filter order match at 390, 768, 1366 pixels in both themes.');
 report.checks.push('Changed board, candidate, request, and prompt layouts fit 390, 768, 1366 pixels in light/dark with reduced motion.');
 writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
