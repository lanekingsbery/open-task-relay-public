import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Gitless/dirty source archives may build, but cannot produce deployment provenance.
export function cleanSourceVersion(root) {
  try {
    const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000}).trim();
    const sha=git(['rev-parse','HEAD']);
    return /^[a-f0-9]{40}$/.test(sha)&&git(['status','--porcelain'])===''?sha:null;
  } catch {return null}
}
function buildDigest(root) {
  const hash=createHash('sha256');
  const walk=relative=>{
    for(const entry of readdirSync(join(root,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const path=relative+'/'+entry.name;
      if(entry.isDirectory())walk(path);
      else if(entry.isFile()) {
        const data=readFileSync(join(root,path));
        hash.update(JSON.stringify([path,data.length]));hash.update(data);
      } else throw new Error('INVALID_BUILD_ARTIFACT');
    }
  };
  walk('dist/server');walk('dist/client');return hash.digest('hex');
}
export function recordRelayBuildSource(root,startedVersion) {
  const source_version=startedVersion&&startedVersion===cleanSourceVersion(root)?startedVersion:null;
  // Outside deployed server/client assets and the source archive; never a public endpoint.
  writeFileSync(join(root,'dist/relay-build.json'),JSON.stringify({source_version,digest:buildDigest(root)})+'\n');
}
export function verifiedRelayBuildSource(root,ciVersion) {
  try {
    const receipt=JSON.parse(readFileSync(join(root,'dist/relay-build.json'),'utf8'));
    if(!/^[a-f0-9]{40}$/.test(ciVersion??'')||ciVersion!==cleanSourceVersion(root)||
      receipt.source_version!==ciVersion||receipt.digest!==buildDigest(root))throw new Error();
    return ciVersion;
  } catch {throw new Error('Relay production configuration requires a clean, matching CI source and build receipt. Rebuild this commit.');}
}
