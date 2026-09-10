import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
function run(command,args){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd:root,stdio:'inherit'});
  let expired=false;
  const timer=setTimeout(()=>{expired=true;child.kill('SIGTERM')},180000);
  const hardStop=setTimeout(()=>child.kill('SIGKILL'),190000);
  const cleanup=()=>{clearTimeout(timer);clearTimeout(hardStop)};
  child.on('error',error=>{cleanup();reject(error)});
  child.on('exit',(code,signal)=>{cleanup();code===0&&!expired?resolve():reject(new Error(`${command} failed (${expired?'timeout':signal||code})`))});
 });
}
await run(process.env.PYTHON || 'python3',['scripts/export-source.py']);
await run(process.execPath,['node_modules/vinext/dist/cli.js','build']);
await run(process.execPath,['scripts/prepare-static-assets.mjs']);
