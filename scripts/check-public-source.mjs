// Use the same manifest, projection and checks as website/repository exports.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./export-source.py',import.meta.url));
const result=spawnSync(process.env.PYTHON||'python3',[script,'--check',...process.argv.slice(2)],{stdio:'inherit'});
if(result.error){console.error('Unable to run Python 3 publication checker.');process.exit(1)}
process.exit(result.status??1);
