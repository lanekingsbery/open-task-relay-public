import test from 'node:test';
import assert from 'node:assert/strict';
import {activityDate,activityPreview,activityTitle} from '../lib/activity-copy.ts';
import {activityLabel,groupActivity} from '../lib/activity.ts';

test('Activity excerpts preserve recorded findings and corrections without inventing a summary',()=>{
 const record=JSON.stringify({summary:'## Correction\n**The earlier comparison failed.** See [the source](https://example.org/source).',findings:['Other recorded details remain in the full record.']});
 assert.equal(activityPreview(record),'Correction The earlier comparison failed. See the source.');
 assert.equal(activityPreview('No completion check was recorded.'),'No completion check was recorded.');
 assert.equal(activityPreview('A failed attempt, followed by a corrected source.',24),'A failed attempt,…');
 assert.equal(activityPreview('{not valid JSON}'),'{not valid JSON}');
 assert.equal(activityPreview(JSON.stringify({findings:['Record without a summary']})),JSON.stringify({findings:['Record without a summary']}));
});

test('Activity display keeps attribution, review eligibility, and simulation distinct',()=>{
 assert.equal(activityLabel({kind:'contribution',managed:0}),'Community contribution');
 assert.equal(activityLabel({kind:'contribution',managed:1}),'Site-run contribution');
 assert.equal(activityLabel({kind:'review',managed:0,eligible:1}),'Independent review');
 assert.equal(activityLabel({kind:'review',managed:0,eligible:0}),'Review · independence not established');
 assert.equal(activityLabel({kind:'review',managed:1,eligible:1}),'Site-run review');
 assert.equal(activityLabel({kind:'accepted',demo:1}),'Simulation');
 const events=[{id:'failed',kind:'contribution',managed:1,actor:'relay',task_id:'task',created_at:'2026-09-29T01:00:00Z',summary:'Failed attempt.'},{id:'corrected',kind:'contribution',managed:1,actor:'relay',task_id:'task',created_at:'2026-09-29T02:00:00Z',summary:'Correction retained.'}];
 assert.deepEqual(groupActivity(events)[0].items,events,'Related disclosures retain every original record');
});

test('Activity dates use UTC and unfamiliar task titles are kept intact',()=>{
 assert.equal(activityDate('2026-09-29T23:59:00-06:00'),'Sep 30, 2026');
 assert.equal(activityDate('unavailable'),'unavailable');
 assert.equal(activityTitle({task_id:'local-fixture',task_title:'A task title from its author'}),'A task title from its author');
 assert.equal(activityTitle({actor_name:'Local curator'}),'Local curator');
});

test('Moderation presentation preserves stored receipts, contributor names, and unrelated ownership',async()=>{
 const {moderationText,receiptPresentation,auditActionLabel,auditSummary,verificationReason,moderationActor}=await import('../lib/moderation-copy.ts');
 const receipt={actor:'owner:moderator@example.invalid',policy_rule:'owner.confirm_publication.v1',reason:'Owner explicitly confirmed this exact draft and revision.',after_json:JSON.stringify({reason:'Owner confirmed publication.',status:'PUBLISHED'}),action_key:'owner:stable-key'};
 const original=JSON.stringify(receipt),shown=receiptPresentation(receipt);
 assert.equal(shown.actor,'Moderation');assert.equal(shown.reason,'Moderation explicitly confirmed this exact draft and revision.');
 assert.equal(JSON.parse(shown.after_json).reason,'Moderation confirmed publication.');
 assert.equal(shown.policy_rule,receipt.policy_rule);assert.equal(shown.action_key,receipt.action_key);assert.equal(JSON.stringify(receipt),original);
 assert.equal(moderationText('Owner decision; owner approval; owner hold; owner controls.'),'Moderation decision; moderation approval; moderation hold; moderation controls.');
 assert.equal(moderationText('Owner-authorized acceptance. Lane Kingsbery checked the evidence.'),'Moderation-authorized acceptance. OTR checked the evidence.');
 assert.equal(moderationText('The property owner retains the land. Follow Treasury owner guidance.'),'The property owner retains the land. Follow Treasury owner guidance.');
 const contribution={actor:'community-agent',summary:'Lane Kingsbery checked the property owner records.'};assert.equal(auditSummary(contribution),contribution.summary);
 assert.equal(auditSummary({actor:null,summary:'Owner confirmed publication.'}),'Moderation confirmed publication.');
 assert.equal(auditSummary({actor:'curation-desk',summary:'curated task added: Owner-requested regional public-good task. No findings or participation manufactured.'}),'curated task added: Moderation-requested regional public-good task. No findings or participation manufactured.');
 assert.equal(auditActionLabel('owner verification failed'),'More work needed');assert.equal(auditActionLabel('owner verification reopened'),'moderation verification reopened');
 assert.equal(verificationReason({actor:'site_owner',reason:'Owner found two unmet requirements.'}),'Moderation found two unmet requirements.');
 assert.equal(verificationReason({actor:'community-agent',reason:contribution.summary}),contribution.summary);
 assert.equal(moderationActor('moderator@example.invalid'),'Moderation');assert.equal(moderationActor('community-agent'),'community-agent');
});

test('Technical website records retain contributor payloads while relabeling administrative history',async()=>{
 const {publicRecordPresentation}=await import('../lib/moderation-copy.ts');
 const record={content:'Lane Kingsbery checked a property owner record.',owner_verification_history:[{actor:'site_owner',reason:'Owner found unmet requirements.'},{actor:'contributor',reason:'The property owner supplied a public source.'}],audit_events:[{actor:null,action:'owner verification reopened',summary:'Owner reviewed the candidate.'}],contract_history:[{actor:null,reason:'Owner reviewed the handoff.'}]};
 const original=JSON.stringify(record),display=publicRecordPresentation(record);
 assert.equal(display.content,record.content);assert.equal(display.owner_verification_history[0].actor,'Moderation');assert.equal(display.owner_verification_history[0].reason,'Moderation found unmet requirements.');
 assert.equal(display.owner_verification_history[1].reason,record.owner_verification_history[1].reason);assert.equal(display.audit_events[0].action,'moderation verification reopened');assert.equal(display.contract_history[0].reason,'Moderation reviewed the handoff.');assert.equal(JSON.stringify(record),original);
});
