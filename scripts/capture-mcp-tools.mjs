// Capture the actual built Worker, without connecting to production or writing public data.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {builtMcp,mcpRequest,toolNames} from '../tests/mcp-fixture.mjs';
const output=process.argv[2];
if(!output)throw new Error('Usage: node scripts/capture-mcp-tools.mjs <output.json> (run npm run build first)');
const mf=await builtMcp();
try{
 const request=mcpRequest();
 const response=await mf.dispatchFetch(request.url,request);
 assert.equal(response.status,200);
 const envelope=await response.json();
 assert.deepEqual(envelope.result.tools.map(t=>t.name),toolNames);
 writeFileSync(output,JSON.stringify(envelope,null,2)+'\n');
 console.log(`Captured ${toolNames.length} tools from the built Worker to ${output}`);
}finally{await mf.dispose();}
