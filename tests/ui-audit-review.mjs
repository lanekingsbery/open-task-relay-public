import assert from 'node:assert/strict';
import {join} from 'node:path';

const A='22222222-2222-4222-8222-222222222222',B='55555555-5555-4555-8555-555555555555';
const TASK_A='11111111-1111-4111-8111-111111111111',TASK_B='44444444-4444-4444-8444-444444444444';
export async function runReviewChecks({browser,fixture,publicURL,out,report,taskId,latestResultId,olderResultId,latestReviewId}){
 const context=await browser.newContext(),errors=[];
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 await context.route('**/*',route=>['127.0.0.1','localhost','[::1]'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 try{
  const page=await context.newPage();
  // Deliberately let these mocked reads resolve after cancellation to test the
  // visible selection, independently of fetch's usual AbortSignal behavior.
  await page.addInitScript(()=>{
   const realFetch=window.fetch.bind(window);
   window.__reviewReads=[];
   window.fetch=(input,options)=>{
    const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;
    if(!/^\/api\/(?:v1\/results\/|tasks\/)/.test(path))return realFetch(input,options);
    return new Promise((resolve,reject)=>window.__reviewReads.push({path,settled:false,respond(status,value,raw=false){this.settled=true;resolve(new Response(raw?value:JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}}));},fail(){this.settled=true;reject(new TypeError('Synthetic local network failure'));}}));
   };
  });
  const pending=async path=>page.waitForFunction(path=>window.__reviewReads?.some(r=>r.path===path&&!r.settled),path);
  const respond=async(path,status,value)=>{await pending(path);await page.evaluate(({path,status,value})=>window.__reviewReads.find(r=>r.path===path&&!r.settled).respond(status,value),{path,status,value});};
  const respondRaw=async(path,status,value)=>{await pending(path);await page.evaluate(({path,status,value})=>window.__reviewReads.find(r=>r.path===path&&!r.settled).respond(status,value,true),{path,status,value});};
  const selection=page.locator('#review-work');
  const textHas=async text=>page.waitForFunction(text=>document.querySelector('#review-work')?.textContent.includes(text),text);
  const open=async id=>{const url=new URL(fixture);url.searchParams.set('surface','guide');url.searchParams.set('review',id);await page.goto(url.href);await pending('/api/v1/results/'+id);};
  const ready=async(id,task,title)=>{await respond('/api/v1/results/'+id,200,{data:{id,task_id:task}});await respond('/api/tasks/'+task,200,{data:{id:task,title}});await textHas('Selected contribution loaded: '+title);};
  const screenshot=async name=>{await page.screenshot({path:join(out,name),fullPage:true});report.screenshots.push(name);};

  await open(A);
  assert.equal(await selection.getAttribute('open'),'');
  assert.ok((await selection.innerText()).includes(A));
  assert.ok((await selection.innerText()).includes('Loading the selected contribution'));
  assert.equal(await selection.getByRole('link',{name:'Contribution record →'}).getAttribute('href'),'/results/'+A);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.className='dark');
  await screenshot('review-loading-390-dark.png');
  await respond('/api/v1/results/'+A,503,{error:{message:'Synthetic unavailable'}});
  await textHas('The selected contribution could not be loaded.');
  assert.ok((await selection.innerText()).includes(A));
  assert.equal(await selection.getByRole('link',{name:'Result · JSON'}).getAttribute('href'),'/api/v1/results/'+A);
  for(const width of [390,768,1366])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:width===390?844:960});await page.evaluate(theme=>document.documentElement.className=theme,theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Review error layout fits '+width+' '+theme);
   await screenshot('review-error-'+width+'-'+theme+'.png');
  }
  await selection.getByRole('button',{name:'Retry lookup'}).click();
  await respond('/api/v1/results/'+A,200,{data:{id:A,task_id:TASK_A}});
  await respond('/api/tasks/'+TASK_A,404,{error:{message:'Synthetic missing task'}});
  await textHas('The contribution was found, but its task details could not be loaded.');
  assert.equal(await selection.getByRole('link',{name:'Task and selected contribution →'}).getAttribute('href'),'/tasks/'+TASK_A+'#result-'+A);
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.className='dark');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Known task links and review instructions fit mobile');
  await screenshot('review-task-error-390-dark.png');
  await selection.getByRole('button',{name:'Retry lookup'}).click();
  await respond('/api/v1/results/'+A,200,{data:{id:A,task_id:TASK_A}});
  await respond('/api/tasks/'+TASK_A,200,{unexpected:'Malformed task envelope'});
  await textHas('The task lookup returned an unreadable response.');
  assert.ok((await selection.innerText()).includes(A));
  await selection.getByRole('button',{name:'Retry lookup'}).click();await ready(A,TASK_A,'Synthetic recovered task');
  report.checks.push('F05: selected section opens while loading; failed result/task reads and malformed task data retain ID and known links; retry recovers.');

  await open(A);await page.getByRole('button',{name:'Select review B'}).click();
  await ready(B,TASK_B,'Synthetic current task B');
  await respond('/api/v1/results/'+A,200,{data:{id:A,task_id:TASK_A}});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok((await selection.innerText()).includes(B));assert.ok((await selection.innerText()).includes('Synthetic current task B'));
  assert.ok(!(await selection.innerText()).includes(A));
  await open(A);await respond('/api/v1/results/'+A,200,{data:{id:A,task_id:TASK_A}});await pending('/api/tasks/'+TASK_A);
  await page.getByRole('button',{name:'Select review B'}).click();await respond('/api/v1/results/'+B,503,{error:{message:'Current read failed'}});await textHas('The selected contribution could not be loaded.');
  await respond('/api/tasks/'+TASK_A,200,{data:{id:TASK_A,title:'Obsolete success A'}});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.ok((await selection.innerText()).includes(B));assert.ok(!(await selection.innerText()).includes('Obsolete success A'));
  assert.equal(await selection.getByRole('button',{name:'Retry lookup'}).isVisible(),true);
  report.checks.push('F05: B resolved before A remains selected; obsolete result/task success cannot replace a newer selection or its error.');
  await open(A);await page.evaluate(()=>window.__reviewReads.find(r=>!r.settled).fail());await textHas('The selected contribution could not be loaded.');
  await selection.getByRole('button',{name:'Retry lookup'}).focus();await page.keyboard.press('Enter');await ready(A,TASK_A,'Synthetic keyboard recovery');
  report.checks.push('F05: network failure retains selection and keyboard retry recovers.');
  await open(A);await respond('/api/v1/results/'+A,404,{error:{message:'Synthetic missing result'}});await textHas('The selected contribution could not be loaded.');
  assert.ok((await selection.innerText()).includes(A));await selection.getByRole('button',{name:'Retry lookup'}).click();
  await respond('/api/v1/results/'+A,200,{data:{id:A,task_id:TASK_A}});await respond('/api/tasks/'+TASK_A,503,{error:{message:'Synthetic task unavailable'}});await textHas('The contribution was found, but its task details could not be loaded.');
  assert.equal(await selection.getByRole('link',{name:'Task and selected contribution →'}).getAttribute('href'),'/tasks/'+TASK_A+'#result-'+A);
  await selection.getByRole('button',{name:'Retry lookup'}).click();await respondRaw('/api/v1/results/'+A,200,'{"data":');await textHas('The selected contribution could not be loaded.');
  assert.ok((await selection.innerText()).includes(A));assert.equal(await selection.getByRole('link',{name:'Task and selected contribution →'}).getAttribute('href'),'/tasks/'+TASK_A+'#result-'+A);
  await selection.getByRole('button',{name:'Retry lookup'}).click();await ready(A,TASK_A,'Synthetic parse recovery');
  report.checks.push('F05: result404, task503, and syntactically invalid result JSON retain selection/known links and recover by retry.');
  await page.setViewportSize({width:1366,height:960});await page.evaluate(()=>document.documentElement.className='dark');await screenshot('review-ready-1366-dark.png');

  const taskPage=await context.newPage(),taskURL=publicURL+'/tasks/'+taskId;
  await taskPage.setViewportSize({width:1366,height:960});await taskPage.goto(taskURL);await taskPage.locator('.current-state').waitFor();
  const state=taskPage.locator('.current-state'),history=taskPage.locator('details.historical-work');
  assert.equal(await state.getByRole('link',{name:'Inspect latest candidate →'}).getAttribute('href'),'#result-'+latestResultId);
  assert.equal(await state.getByRole('link',{name:/Candidate reviews/}).getAttribute('href'),'#reviews-'+latestResultId);
  assert.equal(await taskPage.locator('#result-'+latestResultId).count(),1);
  assert.equal(await history.getAttribute('open'),null);
  assert.equal(await taskPage.locator('#result-'+olderResultId).isVisible(),false);
  assert.equal(await taskPage.locator('#review-'+latestReviewId).isVisible(),true);
  assert.ok((await taskPage.locator('#review-'+latestReviewId).innerText()).includes('Site-run review'));
  assert.ok((await taskPage.locator('#review-'+latestReviewId).innerText()).includes('Criteria: unknown'));
  const position=await taskPage.evaluate(()=>({state:document.querySelector('.current-state').getBoundingClientRect().top,latest:document.querySelector('.work-history').getBoundingClientRect().top,history:document.querySelector('.historical-work').getBoundingClientRect().top}));
  assert.ok(position.state<position.latest&&position.latest<position.history);
  await state.getByRole('link',{name:'Completion criteria ↓'}).focus();await taskPage.keyboard.press('Enter');
  assert.equal(await taskPage.locator('#completion-criteria').isVisible(),true);assert.ok(taskPage.url().endsWith('#completion-criteria'));
  await taskPage.goto(taskURL+'#result-'+olderResultId);
  await taskPage.locator('#result-'+olderResultId).waitFor({state:'visible'});
  assert.equal(await history.getAttribute('open'),'');
  const olderSources=taskPage.locator('#result-'+olderResultId+' details').filter({has:taskPage.locator('summary',{hasText:'Supporting sources'})});
  assert.equal(await olderSources.getAttribute('open'),null);
  assert.ok((await taskPage.locator('#result-'+olderResultId).innerText()).includes('2026-09-29'));
  await olderSources.locator('summary').focus();await taskPage.keyboard.press('Enter');
  assert.equal(await olderSources.getByRole('link').first().isVisible(),true);
  const historyShot='review-historical-fragment-1366-light.png';await taskPage.locator('#result-'+olderResultId).screenshot({path:join(out,historyShot)});report.screenshots.push(historyShot);
  report.checks.push('F06: current state and exact latest candidate precede collapsed history; criteria/reviews are linked; existing result fragment reveals historical evidence with dates and review eligibility preserved.');
  assert.deepEqual(errors,[]);
  // Root captures the same task at all six width/theme combinations.
 }finally{await context.close();}
}
