import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
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
