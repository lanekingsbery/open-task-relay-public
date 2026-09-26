import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync,readdirSync} from 'node:fs';
import {testDatabase} from './test-db.mjs';
import {register,insert,taskContract,write,one} from '../lib/commons.ts';
import {contributionReceipt} from '../lib/contribution-receipt.ts';
import {contributionReceiptResponse} from '../lib/contribution-receipt-http.ts';
import {evidenceBundle} from '../lib/evidence-bundle.ts';
import {resultReviewFields} from '../lib/acceptance-readiness.ts';

async function fixture(accept=true,completeness='complete',db=testDatabase()) {
  const stamp='2026-09-01T00:00:00.000Z';
  const agent=async(name,ip)=>(await register(db,{name,description:'Synthetic receipt regression fixture.'},ip)).agent;
  const owner=await agent('Owner','owner'),producer=await agent('Same name','producer'),reviewer=await agent('Same name','reviewer');
  const taskId=crypto.randomUUID(),resultId=crypto.randomUUID(),reviewId=crypto.randomUUID();
  await db.batch([
    insert(db,'tasks',{id:taskId,created_at:stamp,updated_at:stamp,creator:owner.id,assignee:producer.id,
      title:'Inspect synthetic records',description:'Count the records and state limitations.',required_capabilities:[],
      protocol:{...taskContract.parse({risk_level:'low'}),revision:1},status:'verified',moderation_status:'approved'}),
    insert(db,'results',{id:resultId,created_at:stamp,task_id:taskId,author:producer.id,
      content:'The synthetic source contains three records. Method: counted each row. Limitation: synthetic data only.',evidence:['https://example.org/source'],contract_revision:1,validation:{passed:true}}),
    insert(db,'verifications',{id:reviewId,created_at:stamp,result_id:resultId,author:reviewer.id,verdict:'agree',completeness,
      content:'Counted three synthetic records independently. All criteria checked.',evidence:[],confidence:0.8}),
  ]);
  if(accept)await write(db,['tasks',taskId,'complete'],{result_id:resultId},owner);
  return {db,owner,producer,reviewer,taskId,resultId,reviewId};
}
const req=(method='GET')=>new Request('https://opentaskrelay.org/receipts/fixture',{method});
const readiness=(db,id)=>one(db,`SELECT ${resultReviewFields} FROM results r JOIN tasks t ON t.id=r.task_id WHERE r.id=?`,id);

test('real acceptance yields result-specific receipt, durable author, evidence and recorded timestamp',async()=>{
  const f=await fixture(),r=await contributionReceipt(f.db,f.resultId),b=await evidenceBundle(f.db,f.taskId);
  assert.equal(r.schema_version,'1.0');assert.equal(r.kind,'open-task-relay.accepted-contribution');
  assert.equal(r.status,b.status);assert.equal(r.verified,true);assert.equal(r.result.id,b.result.id);
  assert.equal(r.task.id,b.problem.id);assert.equal(r.producing_agent.id,b.result.author.id);
  assert.equal(r.producing_agent.id,f.producer.id);assert.notEqual(r.producing_agent.id,f.reviewer.id);
  assert.equal(r.acceptance.accepted_at,b.acceptance.accepted_at);assert.equal(r.result.content_sha256,b.result.content_sha256);
  assert.equal(r.reviews[0].id,f.reviewId);assert.equal(r.reviews[0].completeness,'complete');assert.equal(r.reviews[0].eligible_for_independent_review,true);
  assert.equal(r.evidence[0].url,b.result.evidence[0]);assert.equal(r.id,r.canonical_url);
  assert.match(r.id,new RegExp('/receipts/'+f.resultId+'$'));assert.match(r.limitations_notice,/not an endorsement/);
  const oldId=r.id;
  await f.db.prepare('UPDATE agents SET name=? WHERE id=?').bind('Renamed producer',f.producer.id).run();
  const renamed=await contributionReceipt(f.db,f.resultId);
  assert.equal(renamed.id,oldId);assert.equal(renamed.producing_agent.id,r.producing_agent.id);assert.equal(renamed.producing_agent.display_name,'Renamed producer');
});

test('unaccepted, nonexistent and malformed IDs never get a valid badge or leak a record',async()=>{
  const f=await fixture(false);
  for(const id of [f.resultId,crypto.randomUUID(),'not-a-uuid',"' OR 1=1 --"]){
    assert.equal(await contributionReceipt(f.db,id),null);
    for(const format of ['json','html','svg']){
      const response=await contributionReceiptResponse(f.db,req(),id,format),body=await response.text();
      assert.equal(response.status,404);assert.doesNotMatch(body,/Accepted Contributor|Same name|Inspect synthetic records/);
      if(format==='json'){const data=JSON.parse(body);assert.equal(data.verified,false);assert.equal(data.data,null)}
      if(format==='svg')assert.match(body,/OTR \| Unverified/);
    }
  }
});

test('moderation, disputes, simulations and lost acceptance fail closed without exposing hidden details',async(t)=>{
  const cases={
    'quarantined task':f=>f.db.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(f.taskId).run(),
    'pending task':f=>f.db.prepare("UPDATE tasks SET moderation_status='pending' WHERE id=?").bind(f.taskId).run(),
    'archived task':f=>f.db.prepare("UPDATE tasks SET status='closed' WHERE id=?").bind(f.taskId).run(),
    'removed acceptance':f=>f.db.prepare('UPDATE tasks SET accepted_result_id=NULL WHERE id=?').bind(f.taskId).run(),
    'different selected result':f=>f.db.prepare('UPDATE tasks SET accepted_result_id=? WHERE id=?').bind(crypto.randomUUID(),f.taskId).run(),
    'restricted producer':f=>f.db.prepare('UPDATE agents SET posting_restricted=1 WHERE id=?').bind(f.producer.id).run(),
    'restricted creator':f=>f.db.prepare('UPDATE agents SET posting_restricted=1 WHERE id=?').bind(f.owner.id).run(),
    'restricted only reviewer':f=>f.db.prepare('UPDATE agents SET posting_restricted=1 WHERE id=?').bind(f.reviewer.id).run(),
    'simulated producer':f=>f.db.prepare('UPDATE agents SET demo=1 WHERE id=?').bind(f.producer.id).run(),
    'simulated creator':f=>f.db.prepare('UPDATE agents SET demo=1 WHERE id=?').bind(f.owner.id).run(),
    'dispute':f=>f.db.prepare("UPDATE verifications SET verdict='dispute' WHERE id=?").bind(f.reviewId).run(),
    'lost independent review':f=>f.db.prepare('UPDATE agents SET managed=1 WHERE id=?').bind(f.reviewer.id).run(),
    'same declared operator':async f=>{await f.db.prepare("UPDATE agents SET operator='Same operator' WHERE id IN (?,?)").bind(f.producer.id,f.reviewer.id).run()},
    'non-contribution':f=>f.db.prepare("UPDATE results SET result_kind='premise_stale' WHERE id=?").bind(f.resultId).run(),
    'failed validation':f=>f.db.prepare('UPDATE results SET validation=? WHERE id=?').bind('{"passed":false}',f.resultId).run(),
  };
  for(const [name,change] of Object.entries(cases))await t.test(name,async()=>{
    const f=await fixture();assert.ok(await contributionReceipt(f.db,f.resultId));await change(f);
    assert.equal(await contributionReceipt(f.db,f.resultId),null);
    for(const format of ['svg','json','html']){
      const response=await contributionReceiptResponse(f.db,req(),f.resultId,format);
      assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/Accepted Contributor|Same name|Inspect synthetic records/);
    }
  });
});

test('legacy completeness remains unknown and new readiness/acceptance gates remain unchanged',async()=>{
  for(const completeness of ['unknown','partial']){
    const f=await fixture(false,completeness),before=await readiness(f.db,f.resultId);
    assert.equal(before.acceptance_ready,false);assert.equal(await contributionReceipt(f.db,f.resultId),null);
    assert.deepEqual(await readiness(f.db,f.resultId),before);
    await assert.rejects(write(f.db,['tasks',f.taskId,'complete'],{result_id:f.resultId},f.owner),e=>e.code==='INCOMPLETE');
  }
  const f=await fixture();await f.db.prepare("UPDATE verifications SET completeness='unknown' WHERE id=?").bind(f.reviewId).run();
  const r=await contributionReceipt(f.db,f.resultId);
  assert.equal(r.status,'accepted');assert.equal(r.reviews[0].completeness,'unknown');
  // A credential revocation disables future authentication, not historical attribution.
  await f.db.prepare('UPDATE agents SET credential_revoked_at=? WHERE id=?').bind(new Date().toISOString(),f.producer.id).run();
  assert.equal((await contributionReceipt(f.db,f.resultId)).producing_agent.id,f.producer.id);
  await f.db.prepare('DELETE FROM acceptance_snapshots WHERE result_id=?').bind(f.resultId).run();
  await f.db.prepare("DELETE FROM events WHERE entity_id=? AND action='completed'").bind(f.taskId).run();
  const legacy=await contributionReceipt(f.db,f.resultId);
  assert.equal(legacy.acceptance.accepted_at,null);assert.equal(legacy.acceptance.snapshot_available,false);
});

test('projection uses one read snapshot and never changes acceptance, review or moderation data',async()=>{
  const f=await fixture(),queries=[];
  const readOnly={prepare(sql){queries.push(sql);assert.match(sql,/^SELECT /);return f.db.prepare(sql)}};
  await contributionReceipt(readOnly,f.resultId);assert.equal(queries.length,1);
});

test('all HTTP representations fail safely on outage, rate limit and unsupported methods',async()=>{
  const broken={prepare(){throw new Error('secret database diagnostic')}};
  for(const format of ['html','json','svg']){
    const response=await contributionReceiptResponse(broken,req(),crypto.randomUUID(),format);
    assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);
    const body=await response.text();assert.doesNotMatch(body,/Accepted Contributor|secret database diagnostic/);
  }
  const f=await fixture();
  await f.db.prepare('INSERT INTO limits (key,count,expires) VALUES (?,240,?)').bind('read:'+await (await import('../lib/commons.ts')).hash('local')+':'+Math.floor(Date.now()/60000),Math.floor(Date.now()/1000)+60).run();
  const limited=await contributionReceiptResponse(f.db,req(),f.resultId,'svg');
  assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'60');assert.match(await limited.text(),/Unverified/);
  const method=await contributionReceiptResponse(broken,req('POST'),f.resultId,'json');assert.equal(method.status,405);
  const options=await contributionReceiptResponse(broken,req('OPTIONS'),f.resultId,'json');assert.equal(options.status,204);
});

test('actual route adapters expose the same record, safe HTML, embed links and no-store HEAD responses',async()=>{
  const {createServer}=await import('vite');
  const root=fileURLToPath(new URL('../',import.meta.url)),f=await fixture();
  const vite=await createServer({configFile:false,root,appType:'custom',resolve:{alias:{'@':root}},server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},plugins:[{
    name:'receipt-test-db',resolveId(id){if(id==='cloudflare:workers')return '\0receipt-env'},
    load(id){if(id==='\0receipt-env')return 'export const env={}; export function setDB(db){env.DB=db}'}
  }]});
  try{
    (await vite.ssrLoadModule('\0receipt-env')).setDB(f.db);
    await f.db.prepare('UPDATE agents SET name=? WHERE id=?').bind('<script>alert("x")</script>',f.producer.id).run();
    await f.db.prepare('UPDATE results SET evidence=? WHERE id=?').bind('["javascript:alert(1)","https://example.org/source"]',f.resultId).run();
    const params={params:Promise.resolve({id:f.resultId})};
    const jsonRoute=await vite.ssrLoadModule('/app/api/receipts/[id]/route.ts');
    const pageRoute=await vite.ssrLoadModule('/app/receipts/[id]/route.ts');
    const svgRoute=await vite.ssrLoadModule('/app/receipts/[id]/badge.svg/route.ts');
    const data=(await (await jsonRoute.GET(req(),params)).json()).data;
    const html=await (await pageRoute.GET(req(),params)).text();
    for(const value of [data.task.id,data.result.id,data.producing_agent.id,data.acceptance.accepted_at,data.result.content_sha256,data.reviews[0].id,data.reviews[0].completeness,data.canonical_url,data.json_url,data.badge_url])assert.ok(html.includes(value),value);
    assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|href="javascript:/);assert.match(html,/unsafe link disabled/);
    assert.match(html,/GitHub Markdown/);assert.match(html,/image proxies/);assert.match(html,/width=device-width/);
    const badge=await svgRoute.GET(req(),params);assert.equal(badge.status,200);
    const svg=await badge.text();assert.match(svg,/Accepted Contributor/);
    assert.match(svg,/width="260" height="40"/);
    const embeddedIcon=svg.match(/<image href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
    assert.ok(embeddedIcon,'Relay artwork must be self-contained for README image embeds');
    assert.deepEqual(Buffer.from(embeddedIcon[1],'base64'),readFileSync('public/brand/relay-icon-96.94e637828dd6.png'));
    assert.doesNotMatch(svg,/<image[^>]+href="https?:/);
    assert.match(badge.headers.get('content-security-policy'),/img-src data:/);
    for(const route of [jsonRoute,pageRoute,svgRoute]){
      const head=await route.HEAD(req('HEAD'),params);assert.equal(head.status,200);assert.equal(await head.text(),'');
      for(const header of ['cache-control','cdn-cache-control','cloudflare-cdn-cache-control'])assert.match(head.headers.get(header),/no-store/);
    }
    await f.db.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(f.taskId).run();
    const changed=await svgRoute.GET(req(),params);assert.equal(changed.status,404);assert.doesNotMatch(await changed.text(),/Accepted Contributor/);
  }finally{await vite.close()}
});

test('built Worker and local D1 serve all receipt routes and immediately stop verifying quarantined work',async()=>{
  const {Miniflare,convertV4MiniflareOptions}=await import('miniflare');
  const mf=new Miniflare(convertV4MiniflareOptions({
    modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),
    modulesRoot:'dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],
    serviceBindings:{ASSETS:async()=>new Response(null,{status:404})},
    outboundService:async()=>{throw new Error('Receipt verification must not fetch external sources')},
  }));
  try{
    const db=await mf.getD1Database('DB');
    for(const name of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
      for(const sql of readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
    }
    const f=await fixture(true,'complete',db);
    const home=await mf.dispatchFetch('https://opentaskrelay.org/');
    const homepage=await home.text();assert.equal(home.status,200);
    assert.ok(homepage.indexOf('id="how-it-works"')<homepage.indexOf('id="contributor-badge-title"'));
    assert.ok(homepage.indexOf('id="contributor-badge-title"')<homepage.indexOf('id="send-your-ai"'));
    assert.match(homepage,/href="\/contributor-badges"/);
    assert.match(homepage,/aria-label="OTR \| Example badge"/);
    assert.match(homepage,/Example only · no contribution is verified here/);
    assert.doesNotMatch(homepage,/aria-label="OTR \| Accepted Contributor"/);
    const guide=await mf.dispatchFetch('https://opentaskrelay.org/contributor-badges');
    const guideHtml=await guide.text();assert.equal(guide.status,200);
    assert.match(guideHtml,/Get a badge for accepted work/);assert.match(guideHtml,/reputation score/);
    assert.match(guideHtml,/href="https:\/\/opentaskrelay.org\/contributor-badges"/);
    const acceptedPage=await mf.dispatchFetch('https://opentaskrelay.org/trophy-case/'+f.taskId);
    assert.equal(acceptedPage.status,200);
    const acceptedHtml=await acceptedPage.text();
    assert.ok(acceptedHtml.includes('href="/receipts/'+f.resultId+'"'));
    assert.match(acceptedHtml,/Get this contribution’s badge/);
    await db.prepare('UPDATE agents SET posting_restricted=1 WHERE id=?').bind(f.producer.id).run();
    const restrictedPage=await mf.dispatchFetch('https://opentaskrelay.org/trophy-case/'+f.taskId);
    assert.equal(restrictedPage.status,200,'A badge restriction must not break retained evidence');
    assert.doesNotMatch(await restrictedPage.text(),/Get this contribution’s badge/);
    await db.prepare('UPDATE agents SET posting_restricted=0 WHERE id=?').bind(f.producer.id).run();
    const paths=['/receipts/'+f.resultId,'/api/receipts/'+f.resultId,'/receipts/'+f.resultId+'/badge.svg'];
    for(const path of paths){
      const r=await mf.dispatchFetch('https://opentaskrelay.org'+path);
      assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('x-relay-page-cache'),null);
      const body=await r.text();assert.ok(body.includes(path.startsWith('/api/')?f.producer.id:'Accepted Contributor'));
      const head=await mf.dispatchFetch('https://opentaskrelay.org'+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    }
    await db.prepare("UPDATE tasks SET moderation_status='quarantined' WHERE id=?").bind(f.taskId).run();
    for(const path of paths){
      const r=await mf.dispatchFetch('https://opentaskrelay.org'+path);
      assert.equal(r.status,404);assert.match(r.headers.get('cache-control'),/no-store/);assert.doesNotMatch(await r.text(),/Accepted Contributor|Same name/);
    }
  }finally{await mf.dispose()}
});
