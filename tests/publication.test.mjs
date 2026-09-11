import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync,symlinkSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const exporter=fileURLToPath(new URL('../scripts/export-source.py',import.meta.url));
const python=process.env.PYTHON||'python3';
function run(script,args){return spawnSync(python,[script,...args],{encoding:'utf8'})}
function fixture(fn){const tmp=mkdtempSync(join(tmpdir(),'otr-publication-test-'));try{
 const tree=join(tmp,'source'),r=run(exporter,['--output',tree]);assert.equal(r.status,0,r.stderr);
 return fn(tree,tmp);
}finally{rmSync(tmp,{recursive:true,force:true})}}
const check=tree=>run(exporter,['--check','--tree',tree]);
function snapshot(root){const result={};for(const path of readdirSync(root,{recursive:true,withFileTypes:true}))if(path.isFile()){
 const full=join(path.parentPath,path.name);result[full.slice(root.length+1)]=readFileSync(full).toString('base64');
}return result}

test('isolated tree is complete, neutral and reproducible from its own source',()=>fixture((tree,tmp)=>{
 assert.equal(check(tree).status,0);
 const manifest=JSON.parse(readFileSync(join(tree,'publication/manifest.json')));
 const published=snapshot(tree);
 for(const path of manifest.privateFiles)assert.equal(Object.hasOwn(published,path),false,path);
 const second=join(tmp,'second');const result=run(join(tree,'scripts/export-source.py'),['--output',second]);
 assert.equal(result.status,0,result.stderr);assert.deepEqual(snapshot(second),snapshot(tree));
 for(const target of [tree,second]){const r=run(join(target,'scripts/export-source.py'),[]);assert.equal(r.status,0,r.stderr)}
 assert.deepEqual(readFileSync(join(tree,'public/source/opentaskrelay-source.tar')),readFileSync(join(second,'public/source/opentaskrelay-source.tar')));
}));

test('missing required fixture and notices fail without Git',()=>{
 for(const path of ['tests/fixtures/owner-acceptances.synthetic.json','LICENSE'])fixture(tree=>{
  rmSync(join(tree,path));const result=check(tree);assert.notEqual(result.status,0);assert.match(result.stderr,/Required/);
 });
});

test('unlisted operational, environment and generated files fail tree checks',()=>{
 for(const path of ['docs/CLOUDFLARE.md','.env','wrangler.jsonc','dist/accidental.js','node_modules/accidental.txt'])fixture(tree=>{
  mkdirSync(join(tree,path,'..'),{recursive:true});writeFileSync(join(tree,path),'synthetic local sentinel');
  assert.notEqual(check(tree).status,0,path);
 });
});

test('symlink files and parents are rejected, not followed',()=>fixture((tree,tmp)=>{
 const fixturePath=join(tree,'tests/fixtures/owner-acceptances.synthetic.json');rmSync(fixturePath);
 const outside=join(tmp,'outside.json');writeFileSync(outside,'[]');symlinkSync(outside,fixturePath);
 assert.notEqual(check(tree).status,0);
 rmSync(join(tree,'tests/fixtures'),{recursive:true});symlinkSync(tmp,join(tree,'tests/fixtures'));
 assert.notEqual(check(tree).status,0);
}));

test('missing test modules and fixture references are rejected',()=>{
 for(const extra of ['\nimport '+JSON.stringify('./missing-public-module.mjs')+';\n','\nnew URL('+JSON.stringify('./fixtures/missing.json')+',import.meta.url);\n'])fixture(tree=>{
  const path=join(tree,'tests/reliability.test.mjs');writeFileSync(path,readFileSync(path,'utf8')+extra);
  assert.notEqual(check(tree).status,0);
 });
});

test('credential diagnostics never disclose matched values',()=>fixture(tree=>{
 const sentinel='gh'+'p_'+'Z'.repeat(40),path=join(tree,'README.md');
 writeFileSync(path,readFileSync(path,'utf8')+'\n'+sentinel);
 const result=check(tree);assert.notEqual(result.status,0);assert.match(result.stderr,/Possible credential/);
 assert.ok(!(result.stdout+result.stderr).includes(sentinel));
}));

test('operational overrides cannot sneak into an exported tree',()=>fixture(tree=>{
 const path=join(tree,'lib/operational-decisions.ts');writeFileSync(path,readFileSync(path,'utf8')+'\n// unexpected operational payload\n');
 assert.notEqual(check(tree).status,0);
}));


test('environment examples cannot acquire active values',()=>fixture(tree=>{
 const path=join(tree,'.env.example');writeFileSync(path,'EXAMPLE_KEY=synthetic-value\n');
 const result=check(tree);assert.notEqual(result.status,0);assert.match(result.stderr,/Environment example/);
}));

test('ownership filenames cannot leak through exclusions, source, or diagnostics',()=>{
 const synthetic='a'.repeat(32),name='public/'+synthetic+'.txt';
 for(const target of ['exclusion','source','unlisted'])fixture(tree=>{
  if(target==='exclusion'){
   const path=join(tree,'publication/manifest.json'),manifest=JSON.parse(readFileSync(path));
   manifest.privateFiles.push(name);writeFileSync(path,JSON.stringify(manifest));
  }else if(target==='source'){
   const path=join(tree,'README.md');writeFileSync(path,readFileSync(path,'utf8')+'\n'+name);
  }else writeFileSync(join(tree,name),synthetic);
  const result=check(tree);assert.notEqual(result.status,0);
  assert.ok(!(result.stdout+result.stderr).includes(synthetic));
 });
});

test('IndexNow artifacts are rejected even when explicitly allowlisted',()=>{
 for(const name of ['public/indexnow/ownership.txt','public/indexnow-verification.txt','public/synthetic-indexnow-key.txt'])fixture(tree=>{
  const path=join(tree,'publication/manifest.json'),manifest=JSON.parse(readFileSync(path));
  manifest.files.push(name);writeFileSync(path,JSON.stringify(manifest));
  mkdirSync(join(tree,name,'..'),{recursive:true});writeFileSync(join(tree,name),'synthetic-indexnow-key');
  assert.notEqual(check(tree).status,0);
 });
});

test('operational ignores preserve migration, configuration, and public text source',()=>fixture(tree=>{
 const git=(args,input)=>spawnSync('git',['-C',tree,...args],{encoding:'utf8',input});
 assert.equal(git(['init','--quiet']).status,0);
 const ignored=['private.key','backups/export.sql','backup.sql','export-production.sql','production.sql','backup.sql.gz','database.db.bak','state.sqlite3','wrangler.production.jsonc','wrangler.toml','wrangler.staging.json','.secrets','scripts/registry/indexnow.json','public/indexnow/ownership.txt','public/'+('b'.repeat(32))+'.txt'];
 for(const name of ignored)assert.equal(git(['check-ignore','--no-index','-q','--',name]).status,0,'Expected operational artifact to be ignored');
 for(const name of ['wrangler.local.jsonc','drizzle/0000_nice_pandemic.sql','scripts/schema.sql','db/schema.ts','public/robots.txt','public/human-readable-notes.txt'])assert.equal(git(['check-ignore','--no-index','-q','--',name]).status,1,name);
}));

// Model both filesystem layouts and Git success/failure without creating any
// repositories, commits or worktrees. Only the read-only Git subprocess is mocked.
for(const layout of ['directory','file'])test('Git '+layout+' metadata is allowed only at the validated root',()=>fixture(tree=>{
 const script=String.raw`
import sys
from pathlib import Path
from subprocess import CalledProcessError
from unittest import TestCase
from unittest.mock import patch
source, root, layout = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
ns = {'__file__': str(source), '__name__': 'publication_regression'}
exec(compile(source.read_text(), str(source), 'exec'), ns)
metadata = root / '.git'
if layout == 'directory':
    metadata.mkdir()
    (metadata / 'config').write_text('synthetic metadata')
else:
    metadata.write_text('gitdir: ../synthetic-worktree-metadata\n')
case = TestCase()
with patch.object(ns['subprocess'], 'check_output', return_value=b'') as git:
    files = ns['check_tree'](root, True)
    case.assertNotIn('.git', files)
    git.assert_called_once_with(['git', '-C', str(root), 'ls-files', '--cached', '-z'])
    with case.assertRaises(ValueError):
        ns['check_tree'](root, False)
    for name in ['.unexpected', 'tests/.git']:
        extra = root / name
        extra.write_text('synthetic unlisted file')
        with case.assertRaises(ValueError):
            ns['check_tree'](root, True)
        extra.unlink()
with patch.object(ns['subprocess'], 'check_output', side_effect=CalledProcessError(128, 'git')):
    with case.assertRaises(CalledProcessError):
        ns['check_tree'](root, True)
with patch.object(ns['subprocess'], 'check_output', return_value=b'dist/accidental.js\0'):
    with case.assertRaises(ValueError):
        ns['check_tree'](root, True)
if layout == 'directory':
    (metadata / 'config').unlink()
    metadata.rmdir()
else:
    metadata.unlink()
metadata.symlink_to(root / 'LICENSE')
with patch.object(ns['subprocess'], 'check_output') as git:
    with case.assertRaises(ValueError):
        ns['check_tree'](root, True)
    git.assert_not_called()
`;
 const result=spawnSync(python,['-c',script,exporter,tree,layout],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
}));
