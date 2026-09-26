import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {ForkOpenTaskRelay,OpenTaskRelay} from '../public/sdk/opentaskrelay.mjs';
import {ForkOpenTaskRelay as LegacyFork} from '../public/sdk/agent-commons.mjs';

const origin='https://fork.example.test';
test('JS fork clients require explicit non-reference origin for reads, registration, recovery and writes',async t=>{
  const urls=[];
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    urls.push({url:String(url),method:options.method});
    assert.equal(new URL(url).origin,origin);
    assert.equal(options.redirect,'error');
    return Response.json({data:{token:'synthetic-token',agent:{id:'fixture'},agent_id:'fixture'}});
  });
  for(const Client of [ForkOpenTaskRelay,LegacyFork]) {
    for(const bad of [undefined,'https://opentaskrelay.org','https://www.opentaskrelay.org','https://opentaskrelay.org.',
      'https://opentaskrelay.com','https://api.opentaskrelay.com']) {
      assert.throws(()=>new Client({origin:bad}));
      await assert.rejects(Client.register({name:'fixture'},bad));
      await assert.rejects(Client.recover('fixture','synthetic',bad));
    }
    assert.equal(urls.length,Client===ForkOpenTaskRelay?0:5);
    const client=await Client.register({name:'fixture'},origin);
    await client.claim('fixture');await client.message({content:'fixture'});await client.task('fixture');
    await Client.recover('fixture','synthetic',origin);
    client.origin='https://opentaskrelay.org';await assert.rejects(client.claim('fixture'));
    assert.throws(()=>client.createTask({}));
  }
  assert.equal(urls.length,10);
  // Compatibility clients still target the reference service by default; do not claim otherwise.
  assert.equal(new OpenTaskRelay().origin,'https://opentaskrelay.org');
});

test('Python canonical and legacy fork SDKs intercept every network call and reject reference defaults',()=>{
  const result=spawnSync('python3',['-c',String.raw`
import importlib.util, io, json, urllib.request
from pathlib import Path
seen=[]
class Opener:
    def open(self, req, timeout):
        assert req.full_url.startswith('https://fork.example.test/api/v1/')
        seen.append(req.full_url)
        return io.BytesIO(json.dumps({'data':{'token':'synthetic-token','agent':{'id':'fixture'},'agent_id':'fixture','recovery_key':'synthetic','version':1}}).encode())
urllib.request.build_opener=lambda *args: Opener()
for name in ['opentaskrelay','agent_commons']:
    spec=importlib.util.spec_from_file_location(name,Path('public/sdk')/(name+'.py'))
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    Client=mod.ForkOpenTaskRelay
    for origin in [None,'https://opentaskrelay.org','https://www.opentaskrelay.org','https://opentaskrelay.org.','https://opentaskrelay.com']:
        for call in [lambda: Client(origin=origin),lambda: Client.register('fixture','fixture',origin=origin),lambda: Client.recover('fixture','synthetic',origin=origin)]:
            try: call()
            except (ValueError,TypeError): pass
            else: raise AssertionError('unsafe origin accepted')
    for call in [lambda: Client.register('fixture','fixture'),lambda: Client.recover('fixture','synthetic')]:
        try: call()
        except ValueError: pass
        else: raise AssertionError('inherited default escaped guard')
    client=Client.register('fixture','fixture',origin='https://fork.example.test')
    client.claim('fixture');client.message(content='fixture');client.task('fixture')
    Client.recover('fixture','synthetic',origin='https://fork.example.test')
    client.origin='https://opentaskrelay.org'
    try: client.claim('fixture')
    except ValueError: pass
    else: raise AssertionError('mutable origin escaped guard')
assert len(seen)==10
`],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
});

test('public configuration has no Relay activation, schedule, AI or remote bindings',()=>{
  const config=JSON.parse(readFileSync('wrangler.local.jsonc','utf8'));
  assert.equal(config.ai,undefined);assert.equal(config.triggers,undefined);
  assert.equal(config.services,undefined);
  for(const db of config.d1_databases) {
    assert.equal(db.remote,undefined);
    assert.equal(db.database_id,'00000000-0000-4000-8000-000000000000');
  }
  const defaults=readFileSync('publication/defaults/env.example.txt','utf8');
  assert.ok(defaults.split('\n').every(l=>!l.trim()||l.trim().startsWith('#')));
  const policy=readFileSync('lib/relay-policy.ts','utf8');assert.match(policy,/enabled:false/);
  const workflow=readFileSync('publication/defaults/ci.yml.txt','utf8');
  assert.doesNotMatch(workflow,/secrets\.|wrangler deploy|deploy:cloudflare/);
});
