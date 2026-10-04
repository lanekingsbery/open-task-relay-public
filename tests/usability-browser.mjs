import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {moderation,operator,candidate,resultId,reviewId} from './usability-fixture.mjs';
const {chromium}=await import(process.env.MAINTENANCE_BROWSER_MODULE||'playwright');
const phase=process.argv[2]||'after',out='docs/usability-review',url='http://127.0.0.1:4174/tests/fixtures/maintenance/';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1366,height:960},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 page.on('pageerror',e=>errors.push(e.message));
 let data=structuredClone(moderation),ops=structuredClone(operator),posts=[];
 await page.route('**/api/moderation**',async route=>{
  const relay=route.request().url().includes('/relay');
  if(route.request().method()==='POST'){
   const body=route.request().postDataJSON();posts.push(body);
   if(body.action==='accept')data.reviewable=[];
   if(body.action==='owner-verification'&&body.outcome==='failed'){data.reviewable=[];data.owner_verification_failures=[{...candidate,owner_verification_failed:true,owner_verification_history:[{id:1,outcome:'failed',reason:body.reason,actor:'site_owner',created_at:'2026-10-03'}]}];}
   if(body.action==='owner-verification'&&body.outcome==='reopened'){data.owner_verification_failures=[];data.reviewable=[candidate];}
   if(body.decision==='approved')data.tasks=[];
   if(body.action==='resolve_report')data.reports=[];
   if(body.action==='prepare')ops.requests=[{...ops.requests[0],draft_json:JSON.stringify(body.draft),draft_hash:'e'.repeat(64),revision:ops.requests[0].revision+1}];
   if(body.action==='publish')ops.requests=[];
   return route.fulfill({json:{data:{status:'saved'}}});
  }
  return route.fulfill({json:{data:relay?ops:data}});
 });
 for(const width of [1366,390]){
  await page.setViewportSize({width,height:960});await page.goto(url);await page.getByRole('heading',{name:'Compare dated rainfall definitions',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Moderation overflow');
  await page.screenshot({path:out+'/'+phase+'-moderation-'+width+'.png',fullPage:true});
  await page.goto(url+'?surface=operator');await page.getByRole('heading',{name:'Compare public library access policies',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Proposal overflow');
  await page.screenshot({path:out+'/'+phase+'-proposals-'+width+'.png',fullPage:true});
 }
 if(phase==='after'){
  for(const width of [1366,390]){
   data=structuredClone(moderation);ops=structuredClone(operator);posts=[];
   await page.setViewportSize({width,height:960});await page.goto(url);
   const acceptance=page.locator('#accept-'+resultId);await acceptance.getByRole('button',{name:'Accept work',exact:true}).waitFor();
   assert.equal(await acceptance.locator('input[type=checkbox]').count(),0);
   assert.equal(await acceptance.getByLabel('What the work established').inputValue(),'');
   assert.equal(await acceptance.getByRole('button',{name:'Accept work',exact:true}).isDisabled(),true);
   await acceptance.getByLabel('Decision reason').fill('The dated definitions and limitations satisfy both requirements.');
   await acceptance.getByRole('button',{name:'Accept work',exact:true}).focus();await page.keyboard.press('Enter');
   await page.getByRole('status').filter({hasText:'Work accepted.'}).waitFor();
   assert.equal(posts.length,1);assert.equal(posts[0].result_id,resultId);assert.deepEqual(posts[0].review_ids,[reviewId]);assert.equal(posts[0].criteria_checked,true);assert.equal(posts[0].conclusion,undefined);assert.equal(posts[0].review_basis,posts[0].reason);
   assert.equal(await page.locator('#accept-'+resultId).count(),0);assert.equal(await page.getByRole('link',{name:'Next item →'}).getAttribute('href'),'#owner-check');
   data=structuredClone(moderation);await page.reload();await page.locator('#accept-'+resultId).getByLabel('Decision reason').fill('The second definition needs a dated supporting source.');await page.getByRole('button',{name:'Request changes',exact:true}).click();
   await page.getByRole('status').filter({hasText:'Changes requested.'}).waitFor();assert.equal(posts.at(-1).outcome,'failed');
   await page.getByText('Changes requested (1)',{exact:true}).click();await page.getByLabel('Decision reason').fill('The supporting record now warrants reopening this check.');await page.getByRole('button',{name:'Reopen acceptance check'}).click();await page.getByRole('status').filter({hasText:'Acceptance check reopened.'}).waitFor();assert.equal(posts.at(-1).outcome,'reopened');
   const proposal=page.locator('#proposals article');await proposal.getByLabel('Publication reason').fill('Public sources and a bounded task scope reviewed.');await proposal.getByRole('button',{name:'Publish task',exact:true}).click();await page.getByRole('status').filter({hasText:'Task published.'}).waitFor();assert.equal(posts.at(-1).task_id,moderation.tasks[0].id);
   const reported=page.locator('#reports article');await reported.getByLabel('Private resolution reason').fill('The reported note has been reviewed; no further action needed.');await reported.getByRole('button',{name:'Resolve report',exact:true}).click();await page.getByRole('status').filter({hasText:'Report resolved.'}).waitFor();assert.equal(posts.at(-1).report_id,moderation.reports[0].id);
   await page.goto(url+'?surface=operator');await page.getByRole('button',{name:'Publish task',exact:true}).click();await page.getByRole('status').filter({hasText:'Task published.'}).waitFor();assert.equal(posts.at(-1).confirm_publication,true);assert.equal(posts.at(-1).draft_hash,operator.requests[0].draft_hash);assert.equal(posts.at(-1).expected_revision,2);
   ops=structuredClone(operator);await page.reload();await page.getByText('Edit exact publication draft · JSON',{exact:true}).click();
   const edited={...JSON.parse(operator.requests[0].draft_json),title:'Updated guest access comparison'};await page.getByLabel('Exact publication draft').fill(JSON.stringify(edited));
   assert.equal(await page.getByRole('button',{name:'Publish task',exact:true}).count(),0);
   await page.getByRole('button',{name:'Save reviewed draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft saved. Ready to publish.'}).waitFor();assert.equal(posts.at(-1).confirm_review,true);assert.deepEqual(posts.at(-1).draft,edited);
   await page.getByRole('button',{name:'Publish task',exact:true}).click();await page.getByRole('status').filter({hasText:'Task published.'}).waitFor();assert.equal(posts.at(-1).draft_hash,'e'.repeat(64));assert.equal(posts.at(-1).expected_revision,3);
  }
  for(const width of [320,768,1366])for(const theme of ['light','dark']){
   data=structuredClone(moderation);await page.setViewportSize({width,height:960});await page.goto(url);await page.getByRole('button',{name:'Accept work',exact:true}).waitFor();
   await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${theme} overflow`);
   const action=page.getByRole('button',{name:'Accept work',exact:true});await page.getByLabel('Decision reason').fill('Both dated sources meet the requirements and limitations are clear.');await action.focus();assert.equal(await action.evaluate(el=>el===document.activeElement),true);assert.ok((await action.boundingBox()).height>=44);
  }
  // A stale state/error keeps the draft, and an uncertain write blocks another decision.
  data=structuredClone(moderation);await page.goto(url);await page.getByLabel('Decision reason').fill('A reason retained while the server rejects stale reviews.');
  await page.route('**/api/moderation',route=>route.request().method()==='POST'?route.fulfill({status:409,json:{error:{message:'Reviews changed. Inspect them before accepting.'}}}):route.fulfill({json:{data}}));
  await page.getByRole('button',{name:'Accept work',exact:true}).click();await page.getByRole('alert').filter({hasText:'Reviews changed.'}).waitFor();assert.match(await page.getByLabel('Decision reason').inputValue(),/retained/);
  await page.route('**/api/moderation',route=>route.request().method()==='POST'?route.abort('failed'):route.fulfill({json:{data}}));await page.getByRole('button',{name:'Accept work',exact:true}).click();await page.getByRole('alert').filter({hasText:'outcome is unknown'}).waitFor();assert.equal(await page.getByRole('button',{name:'Request changes',exact:true}).isDisabled(),true);
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/'+phase+'-browser.json',JSON.stringify({phase,widths:[1366,390],errors,decisionFlows:phase==='after'?['accept work','request changes','reopen check','publish task','resolve report','save reviewed Relay draft','publish exact saved Relay draft','stale reviews preserve drafts','uncertain writes block further decisions']:[]},null,2)+'\n');
}finally{await browser.close()}
