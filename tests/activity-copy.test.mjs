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
