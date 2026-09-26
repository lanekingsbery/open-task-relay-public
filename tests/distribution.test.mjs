import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {acceptedSharePacket} from '../lib/distribution.ts';

test('accepted result produces bounded share copy with trust disclosure',()=>{
 const packet=acceptedSharePacket({status:'accepted',canonical_url:'https://opentaskrelay.org/trophy-case/task-1',problem:{title:'Check a public water report'},result:{content:'A useful finding supported by public records. '.repeat(20),evidence:['https://example.gov/a']},independent_checks:2});
 assert.equal(packet.shareable,true);
 assert.equal(packet.evidence_count,1);
 assert.equal(packet.independent_checks,2);
 assert.match(packet.share_text,/Accepted public-good result:/);
 assert.match(packet.share_text,/Evidence, reviews & provenance:/);
 assert.ok(packet.summary.length<=320);
 assert.match(packet.disclosure,/does not guarantee correctness/);
});

test('challenged result is never given promotional share copy',()=>{
 const packet=acceptedSharePacket({status:'challenged_or_ineligible',canonical_url:'https://opentaskrelay.org/trophy-case/task-2',problem:{title:'Disputed result'},result:{content:'Earlier accepted text',evidence:[]}});
 assert.equal(packet.shareable,false);
 assert.equal(packet.share_text,null);
});

test('accepted-work distribution surfaces stay wired without enabling trophy discovery',()=>{
 const sitemap=readFileSync('app/sitemap.xml/route.ts','utf8');
 const layout=readFileSync('app/layout.tsx','utf8');
 const feed=readFileSync('app/accepted.xml/route.ts','utf8');
 const bundle=readFileSync('app/trophy-case/[id]/page.tsx','utf8');
 assert.doesNotMatch(sitemap,/trophy-case\//);
 assert.match(layout,/\/accepted\.xml/);
 assert.match(feed,/Accepted Work/);
 assert.match(bundle,/share\.json/);
 assert.match(bundle,/application\/ld\+json/);
});

test('accepted-result page presents the answer first and preserves the full record',async(t)=>{
 const {createServer}=await import('vite');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const root=fileURLToPath(new URL('../',import.meta.url));
 const vite=await createServer({configFile:false,root,appType:'custom',resolve:{alias:[{find:'@/lib/evidence-bundle',replacement:'\0fixture-bundle'},{find:'@',replacement:root}]},server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},plugins:[{
  name:'accepted-page-fixture',
  resolveId(id){if(id==='cloudflare:workers')return '\0fixture-env';if(id==='\0fixture-bundle')return id},
  load(id){if(id==='\0fixture-env')return 'export const env={DB:{}}';if(id==='\0fixture-bundle')return 'let bundle; export function setBundle(value){bundle=value} export async function evidenceBundle(){return bundle}'}
 }]});
 try{
  const {default:Page}=await vite.ssrLoadModule('/app/trophy-case/[id]/page.tsx');
  const {setBundle}=await vite.ssrLoadModule('\0fixture-bundle');
  const fixture={
   status:'accepted',canonical_url:'https://opentaskrelay.org/trophy-case/fixture',json_url:'https://opentaskrelay.org/api/tasks/fixture/evidence',
   problem:{title:'Synthetic presentation fixture',description:'Original task brief',created_at:'2026-09-01T12:00:00Z',task_url:'https://opentaskrelay.org/tasks/fixture'},
   acceptance:{revision:2,criteria:['Reproduce the source count'],expected_output:'An evidence-bearing answer',accepted_at:'2026-09-24T12:30:00Z',explanation:'Accepted against the recorded criteria',snapshot_available:true,snapshot_notice:'Contract captured at acceptance.'},
   result:{id:'result-1',content:'The source lists 42 records.\nLimitation: archived data only.\n<script>untrusted()</script>',created_at:'2026-09-23T12:00:00Z',content_sha256:'a'.repeat(64),evidence:['https://example.org/source','javascript:alert(1)'],author:{id:'writer',name:'Relay',site_run:true}},
   reviews:[{id:'review-1',author:'checker',author_name:'Relay',verdict:'agree',created_at:'2026-09-24T11:00:00Z',content:'Reproduced the count. Limitation: no live data.',evidence:['https://example.org/review'],independence:{eligible_for_independent_review:true,label:'Independent review'}}],
   contributing_agents:[{id:'writer',name:'Relay',site_run:true,declared_operator:'Fixture operator'}],
   disputes:[],limitations_notice:'Limitations remain in the full accepted text and each review.',trust_notice:'Consensus alone does not establish correctness.',
   provenance:{task_revision_history:[{id:'revision-1',revision:1,created_at:'2026-09-01T12:00:00Z',reason:'Original contract'}],all_contributions:[{id:'earlier',created_at:'2026-09-02T12:00:00Z',status:'superseded',url:'https://opentaskrelay.org/tasks/fixture#result-earlier'}],events:[{id:'event-1',created_at:'2026-09-24T12:30:00Z',action:'completed',summary:'Acceptance audit entry'}]},
   license:'CC BY 4.0',attribution:'Credit Relay.',source_license_notice:'Underlying sources retain their own licenses.',citation:'Fixture citation.'
  };
  const render=async(bundle)=>{setBundle(bundle);return renderToStaticMarkup(await Page({params:Promise.resolve({id:'fixture'})}))};
  const learnedContent=html=>html.match(/<h2 id="learned-title">What we learned<\/h2><div class="content">([\s\S]*?)<\/div>/)?.[1];
  const {createElement}=await import('react');
  const escapedText=text=>renderToStaticMarkup(createElement('div',null,text)).slice(5,-6);
  await t.test('existing section headings and inline labels gain emphasis without changing submitted text',async()=>{
   const content='What I checked\r\nRead two public sources.\r\n\r\nFINDING — source comparison\nThe totals agree.\n\nLimitations / unresolved\nArchived data only.\n\nNext useful check:\nCheck the next release.\n\nEvidence: https://example.org/source\nInterpretation: <script>untrusted()</script> & literal text.\n\nConclusion\nNo discrepancy was found.  ';
   const bundle={...fixture,result:{...fixture.result,content}},before=JSON.stringify(bundle);
   const html=await render(bundle),reader=learnedContent(html);
   for(const heading of ['What I checked','FINDING — source comparison','Limitations / unresolved','Next useful check:','Conclusion'])assert.ok(reader.includes('>'+heading+'</h3>'),heading);
   assert.match(reader,/<strong>Evidence:<\/strong> https:\/\/example.org\/source/);
   assert.match(reader,/<strong>Interpretation:<\/strong> &lt;script&gt;/);
   assert.equal(reader.replace(/<\/?(?:h3|strong|span)\b[^>]*>/g,''),escapedText(content),'Every submitted character, space and line ending must survive');
   assert.equal(JSON.stringify(bundle),before);
   const audit=html.split('<details class="record-details">')[1];
   assert.ok(audit.includes('<div class="content">'+escapedText(content)+'</div>'),'Audit submission remains the original plain text');
   const challenged=await render({...bundle,status:'challenged_or_ineligible'});
   assert.ok(challenged.includes('<div class="content">'+escapedText(content)+'</div>'));
   assert.doesNotMatch(challenged,/<h3[^>]*>What I checked<\/h3>/);
  });
  await t.test('unstructured text, ordinary sentences and literal code retain the original rendering',async()=>{
   for(const content of [
    '  A plain answer with no section labels.\r\n\r\nKeep  double spaces, <b>literal markup</b> & punctuation.\n',
    'Finding a discrepancy takes time.\nResults are preliminary.\nThe Conclusion is in the source.\nhttps://example.org/Evidence:reference',
    '```text\nFinding\nEvidence: literal code\n````\n\n~~~\nLimitations\n~~~\n    Conclusion\n\tSources'
   ]){
    const html=await render({...fixture,result:{...fixture.result,content}});
    assert.equal(learnedContent(html),escapedText(content));
   }
  });
  await t.test('answer, verification and safe evidence precede a closed, complete audit trail',async()=>{
   const before=JSON.stringify(fixture),html=await render(fixture);
   const auditStart=html.indexOf('<details class="record-details">');
   assert.ok(auditStart>0);
   const reader=html.slice(0,auditStart),audit=html.slice(auditStart);
   const headings=['What we learned','Verification','Sources / evidence'];
   for(let i=0;i<headings.length;i++){assert.ok(reader.includes(headings[i]));if(i)assert.ok(reader.indexOf(headings[i-1])<reader.indexOf(headings[i]))}
   assert.match(reader,/The source lists 42 records\.\nLimitation: archived data only\./);
   assert.match(reader,/&lt;script&gt;untrusted\(\)&lt;\/script&gt;/);
   assert.match(reader,/<time dateTime="2026-09-24T12:30:00Z">2026-09-24<\/time>/);
   assert.match(reader,/href="\/agents\/checker"/);assert.match(reader,/Independent review/);
   assert.match(reader,/Site-run groundwork/);assert.match(reader,/Limitations remain/);
   assert.match(reader,/href="https:\/\/example.org\/source"/);
   assert.doesNotMatch(reader,/href="javascript:/);assert.match(reader,/unsafe link disabled/);
   assert.doesNotMatch(reader,/Key findings|Task &amp; acceptance criteria|View JSON|SHA-256/);
   assert.match(audit,/^<details class="record-details"><summary>Full evidence &amp; audit trail<\/summary>/);
   for(const text of ['Copy citation','View JSON','Share data','Task &amp; acceptance criteria','Original task brief','Contract revision 2','Reproduce the source count','Final accepted result','Supporting evidence','Reviews &amp; independence','Reproduced the count. Limitation: no live data.','Disputes &amp; limitations','Acceptance &amp; provenance','Fixture operator','Revision history and earlier contributions','Original contract','#result-earlier','Public audit history','Acceptance audit entry','a'.repeat(64),'License &amp; citation','CC BY 4.0','Fixture citation.','Stable canonical URL'])assert.ok(audit.includes(text),text);
   assert.equal(JSON.stringify(fixture),before,'Rendering must not mutate the bundle');
   const structured=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
   assert.deepEqual(structured,{'@context':'https://schema.org','@type':'CreativeWork',name:fixture.problem.title,url:fixture.canonical_url,description:fixture.problem.description,dateCreated:fixture.result.created_at,isPartOf:{'@type':'WebSite',name:'Open-Task-Relay',url:'https://opentaskrelay.org'},citation:fixture.citation,license:fixture.license,creativeWorkStatus:fixture.status});
  });
  await t.test('missing metadata is disclosed without inventing findings or verification',async()=>{
   const html=await render({...fixture,acceptance:{...fixture.acceptance,accepted_at:null,snapshot_available:false,snapshot_notice:'Legacy record: no acceptance-time snapshot.'},result:{...fixture.result,evidence:[],author:{...fixture.result.author,site_run:false}},reviews:[]});
   const reader=html.split('<details class="record-details">')[0];
   assert.match(reader,/Timestamp not recorded/);assert.match(reader,/No reviews are recorded/);assert.match(reader,/No external evidence URLs were attached/);
   assert.doesNotMatch(reader,/Key findings|Independent review|Site-run groundwork/);
   assert.match(html,/Legacy record: no acceptance-time snapshot/);
  });
  await t.test('review origins and recorded disputes remain visible before expansion',async()=>{
   const reviews=[{...fixture.reviews[0],managed:true},{...fixture.reviews[0],id:'unknown',verdict:'dispute',independence:{eligible_for_independent_review:false,label:'Operator unknown'}},{...fixture.reviews[0],id:'simulation',demo:true}];
   const reader=(await render({...fixture,reviews,disputes:[reviews[1]]})).split('<details class="record-details">')[0];
   for(const text of ['Site-run review','Review · independence not established','Simulation','dispute','1 dispute(s) remain'])assert.ok(reader.includes(text),text);
  });
  await t.test('challenged records retain their existing expanded presentation',async()=>{
   const html=await render({...fixture,status:'challenged_or_ineligible',disputes:[fixture.reviews[0]]});
   assert.match(html,/Challenged or no longer eligible/);assert.match(html,/not currently eligible as accepted work/);
   assert.doesNotMatch(html,/What we learned|Full evidence &amp; audit trail|Share the work/);
   assert.ok(html.indexOf('Task &amp; acceptance criteria')<html.indexOf('Final accepted result'));
   assert.match(html,/1 dispute\(s\) remain/);assert.match(html,/Acceptance audit entry/);
  });
 }finally{await vite.close()}
});
