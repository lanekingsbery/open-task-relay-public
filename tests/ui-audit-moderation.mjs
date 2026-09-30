import assert from 'node:assert/strict';

const taskA={id:'11111111-1111-4111-8111-111111111111',title:'Synthetic task A',revision:1,description:'Synthetic task contract for local browser tests.',risk_level:'low',moderation_status:'pending',next_action:'Compare dated sources and record uncertainty.',expected_output:'A cited comparison of the two source definitions.',next_action_sources:['https://example.org/source'],next_action_progress:'Record one dated source definition.',acceptance_criteria:['Cite both dated definitions'],relay_leg:{next_action:'Compare dated sources',source_urls:['https://example.org/source'],useful_progress:'Record one dated source definition.',max_minutes:5}};
const taskB={...taskA,id:'44444444-4444-4444-8444-444444444444',title:'Synthetic task B',next_action:'Read the second task sources and record the unresolved detail.'};
const queue=task=>({resolution_candidates:[],editable:[taskA,taskB],editable_page:1,editable_search:'',editable_has_next:false,editable_selection:task,messages:[],agents:[],agent_actions:[],stale_premises:[],comments:[],comment_actions:[],tasks:[taskA],reviewable:[],owner_verification_failures:[],privacy_requests:[],notifications:[],reports:[]});
const waitFor=async predicate=>{for(let n=0;n<100;n++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,20))}assert.fail('Expected local mock request was not observed')};

export async function runModerationChecks({browser,fixture,out,report}){
 const context=await browser.newContext({viewport:{width:1366,height:960}});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage(),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 let readMode='normal',postMode='success',hold=false;const pending=[],pendingPosts=[],posts=[];
 await page.route('**/api/moderation*',async route=>{
  if(route.request().method()==='POST'){posts.push(JSON.parse(route.request().postData()));if(postMode==='unknown')return route.abort('failed');if(postMode==='hold'){pendingPosts.push(route);return}return route.fulfill({json:{data:{id:taskA.id,status:'saved'}}})}
  const id=new URL(route.request().url()).searchParams.get('task'),data=queue(id===taskB.id?taskB:taskA);
  if(hold){pending.push({route,id,data});return}
  if(readMode==='failure')return route.fulfill({status:503,json:{error:{message:'Synthetic queue refresh failure'}}});
  return route.fulfill({json:{data}});
 });
 const go=surface=>page.goto(fixture+'?surface='+surface);
 try{
  await go('moderation');await page.getByLabel('Exact unresolved question',{exact:true}).waitFor();
  const draft='Owner draft for task A: retain the source date and uncertainty.';
  await page.getByLabel('Exact unresolved question',{exact:true}).fill(draft);
  hold=true;
  await page.evaluate(id=>{const url=new URL(location.href);url.searchParams.set('task',id);history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'))},taskA.id);
  await waitFor(()=>pending.length===1);
  await page.getByLabel('Task',{exact:true}).selectOption(taskB.id);await waitFor(()=>pending.length===2);
  assert.equal(await page.getByRole('button',{name:'Save next leg',exact:true}).isDisabled(),true,'Unresolved selection cannot save the previous task');
  await pending[1].route.fulfill({json:{data:pending[1].data}});await page.getByLabel('Exact unresolved question',{exact:true}).filter({visible:true}).waitFor();
  assert.equal(await page.getByLabel('Task',{exact:true}).inputValue(),taskB.id);
  await waitFor(async()=>await page.getByLabel('Exact unresolved question',{exact:true}).inputValue()===taskB.next_action);
  await pending[0].route.fulfill({json:{data:pending[0].data}}).catch(()=>{});
  assert.equal(await page.getByLabel('Task',{exact:true}).inputValue(),taskB.id);
  assert.equal(await page.getByLabel('Exact unresolved question',{exact:true}).inputValue(),taskB.next_action);
  assert.equal(await page.getByText('Loading selected queues…',{exact:false}).count(),0);
  hold=false;await page.getByLabel('Task',{exact:true}).selectOption(taskA.id);
  await waitFor(async()=>await page.getByLabel('Exact unresolved question',{exact:true}).inputValue()===draft);
  assert.equal(await page.getByLabel('Exact unresolved question',{exact:true}).inputValue(),draft);
  // A late error from a canceled A request cannot replace B's success state.
  pending.length=0;hold=true;
  await page.evaluate(id=>{const url=new URL(location.href);url.searchParams.set('task',id);history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'))},taskA.id);await waitFor(()=>pending.length===1);
  await page.getByLabel('Task',{exact:true}).selectOption(taskB.id);await waitFor(()=>pending.length===2);
  await pending[1].route.fulfill({json:{data:pending[1].data}});await waitFor(async()=>await page.getByLabel('Exact unresolved question',{exact:true}).inputValue()===taskB.next_action);
  await pending[0].route.fulfill({status:503,json:{error:{message:'Obsolete A failure'}}}).catch(()=>{});
  assert.equal(await page.getByRole('alert').count(),0);hold=false;
  report.checks.push('F01: reversed moderation responses retain the latest query/data/loading/error state; unresolved selections cannot mutate; task A draft survives selecting B and returning to A.');

  await go('moderation');await page.getByText('Task moderation (',{exact:false}).click();await page.getByRole('button',{name:'Select for review',exact:true}).click();
  await page.getByLabel('Public review reason (10–1,000 characters)').fill('Owner checked the synthetic contract and source evidence.');
  readMode='failure';await page.getByRole('button',{name:'Approve task',exact:true}).click();await page.getByText('Action confirmed.',{exact:true}).waitFor();await page.getByRole('button',{name:'Retry refresh',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Approve task',exact:true}).isDisabled(),true);const confirmedPosts=posts.length;
  readMode='normal';await page.getByRole('button',{name:'Retry refresh',exact:true}).click();await page.getByRole('button',{name:'Refresh queues',exact:true}).waitFor();
  await page.getByRole('alert').waitFor({state:'detached'});assert.equal(posts.length,confirmedPosts);assert.equal(await page.getByText('Action confirmed.',{exact:true}).count(),1);
  report.checks.push('F02 Moderation: a confirmed decision retains its receipt after a failed queue read; Retry refresh makes no additional POST and clears the recovered read error.');

  postMode='unknown';await page.getByRole('button',{name:'Approve task',exact:true}).click();await page.getByRole('alert').filter({hasText:'outcome is unknown'}).waitFor();
  assert.equal(await page.getByText('Action confirmed.',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Approve task',exact:true}).isDisabled(),true);postMode='success';
  report.checks.push('F02: a lost mutation response is explicitly uncertain and never receives a success receipt or automatic mutation retry.');

  for(const surface of ['resolution','handoff']){
   await go(surface);readMode='failure';
   if(surface==='handoff'){await page.getByLabel('Public reason for this edit',{exact:true}).fill('Owner compared the current public work and specific next question.');await page.getByRole('button',{name:'Save next leg',exact:true}).click()}
   else await page.getByRole('button',{name:'Save this handoff after reviewing it',exact:true}).click();
   await page.getByRole('status').filter({hasText:surface==='handoff'?'Next leg saved.':'Public handoff saved.'}).waitFor();await page.getByRole('button',{name:'Retry refresh',exact:true}).waitFor();
   const before=posts.length;assert.equal(await page.getByRole('button',{name:surface==='handoff'?'Next leg saved':'Handoff saved',exact:true}).isDisabled(),true);
   readMode='normal';await page.getByRole('button',{name:'Retry refresh',exact:true}).click();await page.getByRole('alert').waitFor({state:'detached'});assert.equal(posts.length,before);
  }
  report.checks.push('F02 ResolutionCard/HandoffEditor: confirmed saves survive failed refresh, keep saved controls disabled, and recover with GET-only Retry refresh.');

  await page.getByRole('button',{name:'Start another edit',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Save next leg',exact:true}).isDisabled(),false);
  await page.getByLabel('Public reason for this edit',{exact:true}).fill('Owner checked the current revision before starting a new edit.');
  postMode='hold';await page.getByRole('button',{name:'Save next leg',exact:true}).click();await waitFor(()=>pendingPosts.length===1);
  assert.equal(await page.getByLabel('Exact unresolved question',{exact:true}).isDisabled(),true,'Pending save prevents new edits from being silently marked saved');
  assert.equal(await page.getByLabel('Public reason for this edit',{exact:true}).isDisabled(),true);
  await pendingPosts[0].fulfill({json:{data:{id:taskA.id,status:'saved'}}});await page.getByRole('status').filter({hasText:'Next leg saved.'}).waitFor();postMode='unknown';
  await go('resolution');await page.getByRole('button',{name:'Save this handoff after reviewing it',exact:true}).click();await page.getByRole('alert').filter({hasText:'outcome is unknown'}).waitFor();
  const unknownPosts=posts.length;await page.getByRole('button',{name:'Retry refresh',exact:true}).click();const inspected=page.getByRole('button',{name:'I inspected the current task; start a new edit',exact:true});await inspected.waitFor();
  assert.equal(await page.getByRole('button',{name:'Save this handoff after reviewing it',exact:true}).isDisabled(),true);await inspected.click();assert.equal(await page.getByRole('button',{name:'Save this handoff after reviewing it',exact:true}).isDisabled(),false);assert.equal(posts.length,unknownPosts);postMode='success';
  report.checks.push('F02: pending handoff saves lock editable fields, and an uncertain resolution requires a successful read plus explicit owner inspection before a new edit; neither acknowledgement sends a mutation.');

  await go('handoff');const next=page.getByLabel('Exact unresolved question',{exact:true}),sources=page.getByLabel('Source URLs, one per line',{exact:true}),reason=page.getByLabel('Public reason for this edit',{exact:true});
  const before=posts.length;await next.fill('            ');await sources.fill('http://example.org/source');await reason.fill('           ');await page.getByRole('button',{name:'Save next leg',exact:true}).click();
  assert.equal(posts.length,before);assert.equal(await next.getAttribute('aria-invalid'),'true');assert.equal(await next.evaluate(el=>el===document.activeElement),true);
  const errorId=await next.getAttribute('aria-describedby');assert.ok(errorId);assert.match(await page.locator(`[id="${errorId}"]`).textContent(),/after trimming/);assert.equal(await sources.getAttribute('aria-invalid'),'true');assert.equal(await reason.inputValue(),'           ');
  await next.fill('A retained owner draft with a concrete public-source check.');await reason.fill('Owner reviewed the sources and selected the bounded next check.');await sources.fill(Array.from({length:11},(_,i)=>'https://example.org/source-'+i).join('\n'));await page.getByRole('button',{name:'Save next leg',exact:true}).click();await page.getByText('Use at most 10 source URLs, one per line.',{exact:true}).waitFor();assert.equal(await sources.evaluate(el=>el===document.activeElement),true);assert.equal(posts.length,before);
  await sources.fill(' https://example.org/source \n\n https://www.example.org/second \n');await page.getByRole('button',{name:'Save next leg',exact:true}).click();await page.getByRole('status').filter({hasText:'Next leg saved.'}).waitFor();
  assert.deepEqual(posts.at(-1).source_urls,['https://example.org/source','https://www.example.org/second']);assert.equal(posts.at(-1).expected_revision,1);
  report.checks.push('F07 Handoff: trimmed public HTTPS URLs and the server’s ten-line limit are validated beside fields; whitespace-only drafts are preserved, associated errors announced, first invalid field focused, and successful payload keeps the expected revision.');
  for(const width of [390,768,1366])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:960});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
   for(const surface of ['moderation','resolution','handoff']){
    readMode='normal';await go(surface);await page.locator('main').waitFor();await page.evaluate(value=>{document.documentElement.classList.toggle('dark',value==='dark');document.documentElement.style.colorScheme=value},theme);
    if(surface==='moderation'){
     await page.getByText('Task moderation (',{exact:false}).click();await page.getByRole('button',{name:'Select for review',exact:true}).click();await page.getByLabel('Public review reason (10–1,000 characters)').fill('Owner checked synthetic contract and evidence.');readMode='failure';await page.getByRole('button',{name:'Approve task',exact:true}).click();await page.getByText('Action confirmed.',{exact:true}).waitFor();
    }else if(surface==='resolution'){
     readMode='failure';await page.getByRole('button',{name:'Save this handoff after reviewing it',exact:true}).click();await page.getByRole('status').filter({hasText:'Public handoff saved.'}).waitFor();
    }else{
     await page.getByLabel('Exact unresolved question',{exact:true}).fill('             ');await page.getByLabel('Source URLs, one per line',{exact:true}).fill('http://example.org/source');await page.getByRole('button',{name:'Save next leg',exact:true}).click();await page.getByRole('alert').first().waitFor();
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${surface} ${width} ${theme} recovery overflow`);
    const focused=page.locator(':focus');if(await focused.count())assert.notEqual(await focused.evaluate(el=>getComputedStyle(el).outlineStyle),'none',`${surface} visible focus`);
    const filename=`${surface}-recovery-${width}-${theme}.png`;await page.screenshot({path:out+'/'+filename,fullPage:true});report.screenshots.push(filename);
   }
  }
  report.checks.push('Changed moderation, resolution-recovery, and handoff field-error layouts fit 390, 768, and 1366 pixels in light/dark themes with visible focus and reduced motion.');
  readMode='normal';await page.setViewportSize({width:390,height:960});await go('moderation');await page.getByLabel('Exact unresolved question',{exact:true}).fill('Unsaved owner draft survives the pending selection.');await page.evaluate(()=>document.documentElement.classList.add('dark'));
  pending.length=0;hold=true;await page.getByLabel('Task',{exact:true}).selectOption(taskB.id);await waitFor(()=>pending.length===1);await page.getByText('Loading selected queues…',{exact:false}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Save next leg',exact:true}).isDisabled(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/moderation-loading-390-dark.png',fullPage:true});report.screenshots.push('moderation-loading-390-dark.png');
  await go('handoff');await pending[0].route.fulfill({json:{data:pending[0].data}}).catch(()=>{});hold=false;
  report.checks.push('F01: pending-selection mobile loading state preserves the visible draft and disables mutation; unmount cancels the obsolete read.');
  assert.deepEqual(pageErrors,[]);
 }finally{await context.close()}
}
