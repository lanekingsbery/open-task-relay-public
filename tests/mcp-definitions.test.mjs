import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mcp} from '../lib/protocols.ts';
import {contracts} from '../lib/openapi.ts';
import {utilityContracts} from '../lib/utilities.ts';
import {testDatabase} from './test-db.mjs';
import {actions,builtMcp,mcpRequest,toolNames} from './mcp-fixture.mjs';

const baseline=JSON.parse(readFileSync(new URL('../docs/mcp-quality/baseline.tools-list.json',import.meta.url))).result.tools;
async function localTools(){return (await (await mcp(testDatabase(),mcpRequest())).json()).result.tools;}
// These metadata keywords do not change the set of valid inputs. In particular,
// unreferenced $defs do not apply validation constraints to task_action.body.
function constraints(value){
 if(Array.isArray(value))return value.map(constraints);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['description','$defs'].includes(key)).map(([key,v])=>[key,['properties','patternProperties','definitions','dependentSchemas'].includes(key)?Object.fromEntries(Object.entries(v).map(([name,child])=>[name,constraints(child)])):constraints(v)]));
 return value;
}
function describedProperties(schema,path){
 for(const [key,property] of Object.entries(schema.properties||{})){
  assert.ok(property.description?.trim().length>=20,`${path}.${key} must explain its semantics`);
  describedProperties(property,`${path}.${key}`);
 }
 if(schema.items)describedProperties(schema.items,`${path}[]`);
}

test('tools/list retains the exact current names and input validation contracts',async()=>{
 const tools=await localTools();
 assert.deepEqual(tools.map(t=>t.name),toolNames);
 assert.deepEqual(tools,JSON.parse(readFileSync(new URL('../docs/mcp-quality/current.tools-list.json',import.meta.url))).result.tools,'Published candidate inventory must match the implementation');
 assert.deepEqual(tools.map(t=>constraints(t.inputSchema)),baseline.map(t=>constraints(t.inputSchema)));
 assert.equal(tools.some(t=>t.name==='create_task'),false);
 const task=tools.find(t=>t.name==='task_action');
 assert.deepEqual(task.inputSchema.properties.action.enum,actions);
 assert.deepEqual(Object.keys(task.inputSchema.$defs),actions);
 assert.deepEqual(constraints(task.inputSchema.properties.body),{type:'object'});
});

test('every definition explains authentication, result shape and meaningful use',async()=>{
 const tools=await localTools();
 const distinctions={audit_citations:/source independence/,validate_json:/schema/,register_agent:/existing token/,read_commons:/maintenance/,create_room:/post_message/,post_message:/task_action results/,publish_artifact:/task_action results/,report_abuse:/verdict=dispute/,task_action:/only the creator/};
 for(const tool of tools){
  assert.ok(tool.description.length>=120,tool.name);
  assert.match(tool.description,/authentication|bearer token/,tool.name);
  assert.match(tool.description,/Returns|returns|returned JSON/,tool.name);
  assert.match(tool.description,distinctions[tool.name],tool.name);
  describedProperties(tool.inputSchema,tool.name);
  assert.equal(tool.outputSchema,undefined,'Text-only results must not promise structuredContent');
 }
});

test('annotations disclose local utilities, public writes and read maintenance',async()=>{
 for(const tool of await localTools()){
  const utility=['audit_citations','validate_json'].includes(tool.name);
  assert.deepEqual(tool.annotations,{
   readOnlyHint:utility,
   destructiveHint:['read_commons','task_action'].includes(tool.name),
   idempotentHint:utility,
   openWorldHint:!utility,
  },tool.name);
 }
});

test('action reference schemas document every existing runtime body without changing REST schemas',async()=>{
 const defs=(await localTools()).find(t=>t.name==='task_action').inputSchema.$defs;
 const mapping={claim:'Empty',start:'Empty',release:'Empty',renew:'Empty',handoff:'Handoff',archive:'Archive','review-claim':'ReviewClaim','review-release':'ReviewRelease',results:'Result','request-verification':'Empty',verifications:'Verification','owner-verification':'OwnerVerification',complete:'Complete'};
 for(const [action,contract] of Object.entries(mapping)){
  assert.deepEqual(constraints(defs[action]),constraints(contracts[contract]),action);
  assert.match(defs[action].description,/Returns/,action);
  describedProperties(defs[action],action);
 }
 for(const [toolName,contract] of Object.entries({register_agent:'Agent',create_room:'Room',post_message:'Message',publish_artifact:'Artifact',report_abuse:'Report'})){
  assert.deepEqual(contracts[contract],baseline.find(t=>t.name===toolName).inputSchema,'MCP documentation must not mutate shared '+contract);
 }
 assert.deepEqual(utilityContracts['validate-json'],baseline.find(t=>t.name==='validate_json').inputSchema);
 assert.deepEqual(utilityContracts['citation-audit'],baseline.find(t=>t.name==='audit_citations').inputSchema);
});

test('existing utility and registration calls retain JSON text response envelopes',async()=>{
 const db=testDatabase();
 for(const [name,args,check] of [
  ['validate_json',{text:'not json'},value=>assert.equal(value.valid,false)],
  ['validate_json',{text:'{"a":1}',format:true},value=>assert.equal(value.formatted,'{\n  "a": 1\n}')],
  ['audit_citations',{sources:['doi:10.1234/test','https://doi.org/10.1234/test']},value=>assert.deepEqual(value.duplicate_groups[0].indices,[0,1])],
  ['register_agent',{name:'MCP metadata fixture',description:'Local synthetic test'},value=>{assert.ok(value.agent.id);assert.ok(value.token);assert.ok(value.recovery_key);assert.equal(value.version,1);}],
 ]){
  const response=await mcp(db,mcpRequest('tools/call',{name,arguments:args}));
  assert.equal(response.status,200);
  const {result}=await response.json();
  assert.deepEqual(Object.keys(result).sort(),['content','isError']);
  assert.equal(result.isError,false);
  assert.equal(result.content.length,1);
  assert.equal(result.content[0].type,'text');
  check(JSON.parse(result.content[0].text));
 }
});

test('built Worker serves the same definitions on every supported protocol and endpoint',async()=>{
 const mf=await builtMcp();
 try{
  const expected=await localTools();
  for(const version of ['2025-06-18','2025-11-25','2026-07-28'])for(const path of ['/mcp','/api/mcp']){
   const req=mcpRequest('tools/list',{},version,path);
   const response=await mf.dispatchFetch(req.url,req);
   assert.equal(response.status,200,`${version} ${path}`);
   const {result}=await response.json();
   assert.deepEqual(result.tools,expected,`${version} ${path}`);
   if(version==='2026-07-28')assert.equal(result.resultType,'complete');
   for(const params of [{name:'create_task',arguments:{}},{name:'task_action',arguments:{task_id:'00000000-0000-4000-8000-000000000001',action:'subtasks',body:{}}}]){
    const retired=mcpRequest('tools/call',params,version,path);
    const denied=await mf.dispatchFetch(retired.url,retired);
    assert.equal(denied.status,410);
    assert.equal((await denied.json()).error.data.code,'PUBLIC_TASK_SUBMISSION_DISABLED');
   }
  }
 }finally{await mf.dispose();}
});
