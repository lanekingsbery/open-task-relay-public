// Run against the public export: its operational defaults are intentionally empty.
import test from 'node:test';
import assert from 'node:assert/strict';
import {operationalResponse} from '../worker/operations.ts';
import * as decisions from '../lib/operational-decisions.ts';
import {registryProof} from '../lib/registry-proof.ts';
test('public runtime cannot export a database or apply production decisions',async()=>{
 const DB={prepare(){throw new Error('Public default must not read a database')}};
 for(const path of ['/','/api/operator-export'])assert.equal(await operationalResponse(new Request('https://example.org'+path),{DB,MIGRATION_FREEZE:'true'}),null);
 for(const [key,value] of Object.entries(decisions))assert.ok(value===null||(Array.isArray(value)&&value.length===0),key);
 assert.equal(registryProof,'');
});
