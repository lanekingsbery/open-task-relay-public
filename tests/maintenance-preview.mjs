// Loopback-only synthetic browser fixture. No inference or production credentials.
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createServer as httpServer} from 'node:http';
const root=fileURLToPath(new URL('../',import.meta.url)),req=createRequire(root+'/package.json');
const {Miniflare,convertV4MiniflareOptions}=req('miniflare');
const mf=new Miniflare(convertV4MiniflareOptions({modules:['index.js',...readdirSync(root+'/dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:root+'/dist/server/'+f})),modulesRoot:root+'/dist/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],outboundService:()=>{throw Error('No outbound traffic in fixture')},serviceBindings:{ASSETS:async(request)=>{const path=new URL(request.url).pathname;if(!path.startsWith('/__relay_assets/')||path.includes('..')||!existsSync(root+'/dist/client'+path))return new Response('Missing',{status:404});return new Response(readFileSync(root+'/dist/client'+path),{headers:{'Content-Type':path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.png')?'image/png':path.endsWith('.webp')?'image/webp':'application/octet-stream'}})}}}));
const db=await mf.getD1Database('DB');for(const f of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync(root+'/drizzle/'+f,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(s).run();
const {createTaskFixture}=await import(pathToFileURL(root+'/tests/task-fixture.mjs'));
await db.prepare("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen,managed) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-01-01','Local curator','Synthetic fixture','[]','[]','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-01-01',1),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-01-01','Local researcher','Synthetic fixture','[]','[]','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-01-01',0)").run();
let sample;
for(let i=0;i<105;i++){const item=await createTaskFixture(db,{title:'Fixture '+String(i).padStart(3,'0')+': compare public rainfall definitions',description:'Synthetic local task: compare dated public definitions, preserve uncertainty, and leave a cited next step.',objective:'Explain whether the published rainfall unit definitions agree.',expected_output:'A cited comparison with dates and remaining uncertainty.',acceptance_criteria:['Cite both definitions and dates','Document remaining uncertainty'],next_action:'Read one definition and record its unit, date, and any ambiguity.',inputs:[{description:'Synthetic reference',url:'https://example.org/rainfall'}],next_action_sources:['https://example.org/rainfall']},{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',managed:1});if(i===104)sample=item;}
await db.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,contract_revision) VALUES (?,'2026-09-28T10:00:00Z',?,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Synthetic local contribution. The dated definitions use the same unit, but a second source still needs independent checking.','[\"https://example.org/rainfall\"]',1)").bind(crypto.randomUUID(),sample.id).run();

// Optional long-thread fixture for the focused UI audit. Never production data.
if(process.env.UI_AUDIT_FIXTURE==='1'){
 for(let i=0;i<12;i++){
  const rid=i===0?'66666666-6666-4666-8666-666666666666':i===11?'77777777-7777-4777-8777-777777777777':crypto.randomUUID();
  await db.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,contract_revision) VALUES (?,?,?,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',?,?,1)").bind(rid,`2026-09-29T${String(i).padStart(2,'0')}:00:00Z`,sample.id,(i===11?'Synthetic latest candidate: ':'Synthetic historical contribution: ')+('A dated public definition, evidence, and remaining uncertainty. '.repeat(18)),JSON.stringify(Array.from({length:6},(_,n)=>'https://example.org/source/'+n))).run();
  const vid=i===11?'88888888-8888-4888-8888-888888888888':crypto.randomUUID();
  await db.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence,completeness) VALUES (?,?,?,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','agree',?,'[]',0.8,'unknown')").bind(vid,`2026-09-29T${String(i).padStart(2,'0')}:30:00Z`,rid,'Synthetic review: useful comparison; every acceptance criterion still requires an independent completion check.').run();
 }
 console.log('UI audit task ID: '+sample.id);
}

// A second synthetic task exercises the accepted evidence bundle.
await db.prepare("INSERT INTO agents(id,created_at,name,description,capabilities,interests,token_hash,last_seen) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','2026-01-01','Local independent reviewer','Synthetic fixture','[]','[]','local-reviewer','2026-01-01')").run();
const accepted=await createTaskFixture(db,{title:'Synthetic accepted work: dated source comparison',description:'Synthetic evidence bundle for local layout verification.',acceptance_criteria:['Cite the source and its date'],expected_output:'A dated source comparison with uncertainty.'},{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',managed:1});
const acceptedResult=crypto.randomUUID();
await db.prepare("INSERT INTO results(id,created_at,task_id,author,content,evidence,contract_revision) VALUES (?,'2026-09-28T10:00:00Z',?,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Synthetic accepted comparison: the dated definitions agree; limits and citations remain inspectable.','[\"https://example.org/rainfall\"]',1)").bind(acceptedResult,accepted.id).run();
await db.prepare("INSERT INTO verifications(id,created_at,result_id,author,verdict,content,evidence,confidence,completeness) VALUES (?,'2026-09-28T11:00:00Z',?,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','agree','Synthetic independent comparison of the source, date and requirement.','[]',0.9,'complete')").bind(crypto.randomUUID(),acceptedResult).run();
await db.prepare("UPDATE tasks SET status='completed',accepted_result_id=? WHERE id=?").bind(acceptedResult,accepted.id).run();
const server=httpServer(async(req,res)=>{try{const response=await mf.dispatchFetch('http://127.0.0.1:4173'+req.url,{method:req.method,headers:req.headers});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){res.writeHead(500);res.end(String(e))}});server.listen(4173,'127.0.0.1');
const {createServer}=await import(req.resolve('vite')),{default:react}=await import(req.resolve('@vitejs/plugin-react'));
const vite=await createServer({root,configFile:false,plugins:[react()],resolve:{alias:[{find:'next/link',replacement:root+'/tests/fixtures/ui-audit/link.tsx'},{find:'next/navigation',replacement:root+'/tests/fixtures/ui-audit/navigation.ts'},{find:'@',replacement:root}]},server:{host:'127.0.0.1',port:4174,strictPort:true},optimizeDeps:{include:['react','react-dom/client']}});await vite.listen();
console.log('Local public preview: http://127.0.0.1:4173 · Synthetic owner fixture: http://127.0.0.1:4174/tests/fixtures/maintenance/');
process.on('SIGTERM',async()=>{server.close();await vite.close();await mf.dispose();process.exit()});
