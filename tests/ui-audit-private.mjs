// Observable private form and chat recovery checks. Every request stays local and mocked.
import assert from 'node:assert/strict';
const receipt={status:'HOLD',reason:'Synthetic request retained for review.',task_id:null};
const proposal={title:'Compare public definitions',objective:'Compare dated definitions.',beneficiary:'Readers of public data.',next_action:'Read one dated source.',expected_output:'A cited comparison.',category:'environment',acceptance_criteria:['Cite the dated source'],sources:['https://example.org/source']};
export async function runPrivateChecks({browser,fixture,out,report}){
 const context=await browser.newContext({viewport:{width:1366,height:960}});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage(),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 let mode='success',posts=[],gets=[],held=[];
 await page.route('**/api/task-requests',async route=>{
  const request=route.request();
  if(request.method()==='POST')posts.push(request.postData());else gets.push(request.headers()['x-request-key']);
  if(mode==='network')return route.abort('failed');
  if(mode==='pending'){held.push(route);return}
  if(mode==='malformed')return route.fulfill({json:{data:{status:'HOLD'}}});
  if(mode==='broken-json')return route.fulfill({contentType:'application/json',body:'{broken'});
  return route.fulfill({json:{data:receipt}});
 });
 const go=async surface=>{await page.goto(fixture+'?surface='+surface);await page.locator('main').waitFor()};
 const fillValid=async()=>{
  for(const [name,value] of Object.entries({title:'Compare dated definitions',objective:'Check two dated definitions.',beneficiary:'People using public data.',next_action:'Read the first dated source.',expected_output:'A cited comparison with uncertainty.',acceptance_criteria:'Cite both dated sources',sources:'  https://example.org/source  '}))await page.locator(`[name="${name}"]`).fill(value);
 };
 try{
  await go('request');await fillValid();
  await page.locator('[name=title]').fill('   ');await page.locator('[name=objective]').fill('\n  ');await page.getByRole('button',{name:'Send suggestion',exact:true}).click();
  assert.equal(await page.locator(':focus').getAttribute('name'),'title');assert.equal(await page.locator('[name=title]').getAttribute('aria-invalid'),'true');
  assert.equal(await page.locator('#request-title-error').textContent(),'Enter a title with at least two characters.');assert.equal(await page.locator('[name=title]').getAttribute('aria-describedby'),'request-title-error');assert.equal(posts.length,0);
  await fillValid();await page.locator('[name=sources]').fill('http://example.org/source');await page.getByRole('button',{name:'Send suggestion',exact:true}).click();assert.equal(await page.locator(':focus').getAttribute('name'),'sources');await page.locator('#request-sources-error').waitFor();assert.equal(posts.length,0);
  await page.locator('[name=sources]').fill(Array(6).fill('https://example.org/source').join('\n'));await page.locator('[name=acceptance_criteria]').fill(Array(6).fill('Cite the source').join('\n'));await page.getByRole('button',{name:'Send suggestion',exact:true}).click();
  assert.equal(await page.locator(':focus').getAttribute('name'),'acceptance_criteria');await page.getByText('Enter one to five acceptance criteria, one per line.',{exact:true}).waitFor();await page.getByText('Enter one to five public HTTPS sources, one per line.',{exact:true}).waitFor();assert.equal(posts.length,0);
  await fillValid();mode='network';await page.getByRole('button',{name:'Send suggestion',exact:true}).click();await page.getByRole('alert').filter({hasText:'Submission not confirmed.'}).waitFor();
  const original=posts[0],firstKey=JSON.parse(original).request_key;assert.deepEqual(JSON.parse(original).sources,['https://example.org/source']);
  await page.locator('[name=title]').fill('Corrected proposal title');await page.getByLabel('Private status key',{exact:true}).fill('b'.repeat(64));mode='success';await page.getByRole('button',{name:'Retry exact submission',exact:true}).click();await page.getByRole('status').filter({hasText:receipt.reason}).waitFor();assert.equal(posts[1],original);
  await page.getByRole('button',{name:'Start new suggestion',exact:true}).click();assert.equal(await page.locator('[name=title]').inputValue(),'Corrected proposal title');await page.getByRole('button',{name:'Send suggestion',exact:true}).click();await page.locator('.private-request-attempt').nth(1).getByRole('status').waitFor();
  assert.notEqual(JSON.parse(posts[2]).request_key,firstKey);assert.equal(JSON.parse(posts[2]).title,'Corrected proposal title');assert.equal(await page.locator('.private-request-attempt').count(),2);
  await page.locator('.private-request-attempt').first().getByRole('button',{name:'Check this suggestion’s status'}).click();await page.locator('#request-status').getByRole('status').waitFor();assert.equal(gets.at(-1),firstKey);assert.equal(await page.getByLabel('Private status key',{exact:true}).inputValue(),firstKey);
  assert.equal(new URL(page.url()).searchParams.has('request_key'),false);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  report.checks.push('F04/F07: whitespace, HTTP and six-line inputs focus adjacent described field errors without writes; trimmed sources submit; retry uses original serialized key/payload despite draft and lookup edits; explicit new proposal gets a new key and retains earlier lookup.');

  await go('request');await fillValid();mode='malformed';await page.getByRole('button',{name:'Send suggestion',exact:true}).click();await page.getByRole('alert').filter({hasText:'valid receipt'}).waitFor();const malformedBody=posts.at(-1);
  mode='success';await page.getByRole('button',{name:'Retry exact submission',exact:true}).click();await page.getByRole('status').filter({hasText:receipt.reason}).waitFor();assert.equal(posts.at(-1),malformedBody);
  mode='malformed';await page.getByRole('button',{name:'Check status',exact:true}).click();await page.locator('#request-status').getByRole('alert').filter({hasText:'Status unavailable.'}).waitFor();assert.equal(await page.locator('.private-request-attempt').getByRole('status').count(),1);
  mode='success';await page.getByRole('button',{name:'Check status',exact:true}).click();await page.locator('#request-status').getByRole('status').waitFor();assert.equal(await page.locator('#request-status').getByRole('alert').count(),0);

  await go('request');await fillValid();mode='broken-json';await page.getByRole('button',{name:'Send suggestion',exact:true}).click();await page.getByRole('alert').filter({hasText:'could not be read'}).waitFor();const brokenBody=posts.at(-1);mode='success';await page.getByRole('button',{name:'Retry exact submission',exact:true}).click();await page.getByRole('status').filter({hasText:receipt.reason}).waitFor();assert.equal(posts.at(-1),brokenBody);

  await go('request');await page.clock.install();await fillValid();mode='pending';await page.getByRole('button',{name:'Send suggestion',exact:true}).click();await page.getByRole('status').filter({hasText:'Sending suggestion…'}).waitFor();const pendingBody=posts.at(-1);
  await page.clock.fastForward(16_000);await page.getByRole('alert').filter({hasText:'outcome is unknown'}).waitFor();assert.equal(await page.getByRole('button',{name:'Retry exact submission',exact:true}).isEnabled(),true);
  mode='success';await page.getByRole('button',{name:'Retry exact submission',exact:true}).click();await page.getByRole('status').filter({hasText:receipt.reason}).waitFor();assert.equal(posts.at(-1),pendingBody);
  mode='pending';await page.getByRole('button',{name:'Check status',exact:true}).click();await page.getByRole('status').filter({hasText:'Checking suggestion status…'}).waitFor();await page.clock.fastForward(16_000);await page.locator('#request-status').getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Check status',exact:true}).isEnabled(),true);
  mode='success';await page.getByRole('button',{name:'Check status',exact:true}).click();await page.locator('#request-status').getByRole('status').waitFor();assert.equal(await page.locator('#request-status').getByRole('alert').count(),0);
  report.checks.push('F03 private form: unresolved POST/GET recover after the 15-second deadline; malformed receipt and network failure remain recoverable; successful receipts survive failed lookups and recovery clears lookup errors.');

  let intakeMode='pending',intakes=[],includePreview=true;
  await page.route('**/api/relay/chat',route=>route.fulfill({json:includePreview?{text:'Synthetic proposal ready for confirmation.',cards:[],generated:false,preview:{proposal,request_key:'c'.repeat(64),expires:Date.now()+3600000,signature:'synthetic-signature'}}:{text:'Synthetic reply: '+JSON.parse(route.request().postData()).message,cards:[],generated:false}}));
  await page.route('**/api/relay/chat/intake',route=>{intakes.push(route.request().postData());if(intakeMode==='pending'){held.push(route);return}if(intakeMode==='network')return route.abort('failed');if(intakeMode==='malformed')return route.fulfill({json:{data:[]}});return route.fulfill({json:{data:receipt}})});
  const preview=async()=>{await go('chat');await page.getByLabel('Message Relay').fill('I want to propose a public-good task');await page.getByRole('button',{name:'Send message'}).click();await page.getByRole('button',{name:'Confirm submission',exact:true}).waitFor()};
  await preview();await page.getByRole('button',{name:'Confirm submission',exact:true}).click();await page.getByRole('status').filter({hasText:'Submitting confirmed private proposal…'}).waitFor();await page.clock.fastForward(16_000);await page.getByRole('alert').filter({hasText:'outcome is unknown'}).waitFor();assert.equal(await page.getByRole('button',{name:'Check private request status',exact:true}).isEnabled(),true);
  const chatBody=intakes[0];includePreview=false;
  for(let index=0;index<13;index++){await page.getByLabel('Message Relay').fill('Follow-up '+index);await page.getByRole('button',{name:'Send message'}).click();await page.getByText('Synthetic reply: Follow-up '+index,{exact:true}).waitFor()}
  assert.equal(await page.getByRole('button',{name:'Retry exact submission',exact:true}).count(),1);await page.getByText('c'.repeat(64),{exact:true}).waitFor();includePreview=true;
  intakeMode='malformed';await page.getByRole('button',{name:'Retry exact submission',exact:true}).click();await page.getByRole('alert').filter({hasText:'valid receipt'}).waitFor();assert.equal(intakes[1],chatBody);
  intakeMode='success';await page.getByRole('button',{name:'Retry exact submission',exact:true}).click();await page.getByRole('status').filter({hasText:receipt.reason}).waitFor();assert.equal(intakes[2],chatBody);assert.equal(await page.getByRole('button',{name:'Retry exact submission',exact:true}).count(),0);
  mode='network';await page.getByRole('button',{name:'Check private request status',exact:true}).click();await page.getByRole('alert').filter({hasText:'Status unavailable.'}).waitFor();assert.equal(await page.getByRole('status').filter({hasText:receipt.reason}).count(),1);
  mode='success';await page.getByRole('button',{name:'Check private request status',exact:true}).click();await page.getByRole('alert').filter({hasText:'Status unavailable.'}).waitFor({state:'hidden'});assert.equal(gets.at(-1),'c'.repeat(64));
  report.checks.push('F03 chat: confirmation deadline returns unknown-outcome recovery; uncertain attempt/key survives thirteen subsequent replies; malformed confirmation retries identical signed preview/key/body; successful receipt survives status failure; lookup uses captured private key.');

  if(await page.getByRole('button',{name:'Unmount private surface',exact:true}).count()){
   await preview();intakeMode='pending';await page.getByRole('button',{name:'Confirm submission',exact:true}).click();await page.getByRole('status').filter({hasText:'Submitting confirmed private proposal…'}).waitFor();const chatCancelled=page.waitForEvent('requestfailed',{predicate:request=>request.url().endsWith('/api/relay/chat/intake')});await page.getByRole('button',{name:'Unmount private surface',exact:true}).click();assert.match((await chatCancelled).failure().errorText,/ABORTED/);await page.clock.fastForward(16_000);assert.equal(await page.getByRole('alert').count(),0);
   await go('request');await fillValid();mode='pending';await page.getByRole('button',{name:'Send suggestion',exact:true}).click();await page.getByRole('status').filter({hasText:'Sending suggestion…'}).waitFor();const formCancelled=page.waitForEvent('requestfailed',{predicate:request=>request.url().endsWith('/api/task-requests')&&request.method()==='POST'});await page.getByRole('button',{name:'Unmount private surface',exact:true}).click();assert.match((await formCancelled).failure().errorText,/ABORTED/);await page.clock.fastForward(16_000);assert.equal(await page.getByRole('alert').count(),0);
   report.checks.push('F03: unmount during pending chat confirmation/private form write aborts the actual browser request, clears the component, and produces no stale recovery update or browser error.');
  }
  await go('request');await fillValid();await page.locator('[name=sources]').fill('http://example.org/source');await page.getByRole('button',{name:'Send suggestion',exact:true}).click();
  for(const width of [390,768,1366])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.evaluate(theme=>{document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.style.colorScheme=theme},theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`request validation ${width} ${theme} overflow`);
   const filename=`request-validation-${width}-${theme}.png`;await page.screenshot({path:out+'/'+filename,fullPage:true});report.screenshots.push(filename);
  }
  await preview();intakeMode='pending';await page.getByRole('button',{name:'Confirm submission',exact:true}).click();await page.getByRole('status').filter({hasText:'Submitting confirmed private proposal…'}).waitFor();await page.clock.fastForward(16_000);await page.getByRole('alert').waitFor();
  for(const width of [390,768,1366])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.evaluate(theme=>{document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.style.colorScheme=theme},theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`chat recovery ${width} ${theme} overflow`);
   await page.locator('.relay-chat-log').evaluate(el=>el.scrollTop=el.scrollHeight);
   await page.getByRole('button',{name:'Retry exact submission',exact:true}).focus();await page.keyboard.press('Tab');
   assert.equal(await page.getByRole('button',{name:'Check private request status',exact:true}).evaluate(el=>el===document.activeElement),true);
   assert.notEqual(await page.locator(':focus').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
   const filename=`chat-recovery-${width}-${theme}.png`;await page.screenshot({path:out+'/'+filename,fullPage:true});report.screenshots.push(filename);
  }
  assert.deepEqual(pageErrors,[]);
 }finally{await context.close()}
}
