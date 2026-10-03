import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {ESLint} from 'eslint';

const root=fileURLToPath(new URL('../',import.meta.url));
const eslint=new ESLint({cwd:root});
const severity=(config,rule)=>{const value=config.rules[rule];return Array.isArray(value)?value[0]:value};

test('page-link enforcement permits REST document links while retaining application navigation checks',async()=>{
 const cases=[
  ['/tasks','export default function Fixture(){return <a href="/tasks">Fixture</a>}',true],
  ['/tasks/11111111-1111-4111-8111-111111111111','export default function Fixture(){return <a href="/tasks/11111111-1111-4111-8111-111111111111">Fixture</a>}',true],
  ['/api/tasks','export default function Fixture(){return <a href="/api/tasks">Fixture</a>}',false],
  ['/api/reviews?kind=completion','export default function Fixture(){return <a href="/api/reviews?kind=completion">Fixture</a>}',false],
  ['/api/../tasks','export default function Fixture(){return <a href="/api/../tasks">Fixture</a>}',true],
  ['/api/%2e%2e/tasks','export default function Fixture(){return <a href="/api/%2e%2e/tasks">Fixture</a>}',true],
  ['#requests','export default function Fixture(){return <a href="#requests">Fixture</a>}',false],
  ['/tasks','export default function Fixture(){return <a href="/tasks" download>Fixture</a>}',false],
  ['https://example.org/tasks','export default function Fixture(){return <a href="https://example.org/tasks">Fixture</a>}',false],
 ];
 for(const [href,source,blocked] of cases){
  const [result]=await eslint.lintText(source,{filePath:root+'components/lint-scope-fixture.tsx'});
  const diagnostics=result.messages.filter(message=>message.ruleId==='otr/no-html-link-for-pages'||message.ruleId==='@next/next/no-html-link-for-pages');
  assert.equal(diagnostics.length>0,blocked,href+' must retain its intended navigation boundary');
  for(const diagnostic of diagnostics){assert.equal(diagnostic.ruleId,'otr/no-html-link-for-pages');assert.equal(diagnostic.severity,2)}
  assert.equal(result.fatalErrorCount,0);
 }
});

test('lint exceptions stay precise while owned application and test code remains enforced',async()=>{
 for(const file of ['app/[section]/page.tsx','components/commons.tsx','tests/fixtures/maintenance/ui.tsx','tests/client-hooks.test.mjs']){
  assert.equal(await eslint.isPathIgnored(root+file),false,file+' must remain in lint scope');
  const config=await eslint.calculateConfigForFile(root+file);
  for(const rule of ['@typescript-eslint/no-unused-vars','@typescript-eslint/no-explicit-any','react-hooks/rules-of-hooks','react-hooks/exhaustive-deps','react-hooks/set-state-in-effect'])assert.ok(severity(config,rule)>0,file+' must enforce '+rule);
 }
 for(const file of ['app/[section]/page.tsx','components/commons.tsx']){
  const config=await eslint.calculateConfigForFile(root+file);assert.equal(severity(config,'@next/next/no-html-link-for-pages'),0);assert.equal(severity(config,'otr/no-html-link-for-pages'),2);
 }
 const braces=await eslint.calculateConfigForFile(root+'vendor/braces/lib/parse.js');assert.equal(severity(braces,'@typescript-eslint/no-require-imports'),0);assert.ok(severity(braces,'@typescript-eslint/no-unused-vars')>0);
 for(const file of ['scripts/build-public.mjs','tests/client-hooks.test.mjs','lib/commons.ts','vendor/other/fixture.js','vendor/braces/fixture.ts'])assert.ok(severity(await eslint.calculateConfigForFile(root+file),'@typescript-eslint/no-require-imports')>0,file+' must not inherit the Braces CommonJS exception');
 for(const file of ['components/home-badges.tsx','components/source-check-badge.tsx'])assert.equal(severity(await eslint.calculateConfigForFile(root+file),'@next/next/no-img-element'),0);
 for(const file of ['components/commons.tsx','components/home-work.tsx','app/[section]/page.tsx','tests/fixtures/maintenance/ui.tsx'])assert.ok(severity(await eslint.calculateConfigForFile(root+file),'@next/next/no-img-element')>0,file+' must not inherit the provider badge exception');
 for(const file of ['components/ui/button.tsx','hooks/use-mobile.ts']){
  const config=await eslint.calculateConfigForFile(root+file);for(const rule of ['@typescript-eslint/no-unused-vars','react-hooks/purity','react-hooks/set-state-in-effect'])assert.equal(severity(config,rule),0,file+' must retain its existing vendored boundary');assert.ok(severity(config,'@typescript-eslint/no-explicit-any')>0);
 }
});
