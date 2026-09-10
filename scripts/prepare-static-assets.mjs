import {readFile,mkdir,rename,rm,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {ASSET_STORAGE_PREFIX,STATIC_DIRECTORIES,parseStaticHeaders} from '../lib/static-assets.mjs';

const client=resolve('dist/client');
const source=await readFile('public/_headers','utf8');
const rules=parseStaticHeaders(source);
if(!rules.length)throw new Error('Missing static asset header rules');
for(const directory of STATIC_DIRECTORIES){
 const from=resolve(client,directory),to=resolve(client,ASSET_STORAGE_PREFIX.slice(1),directory);
 if(!(await stat(from)).isDirectory())throw new Error('Missing built static directory: '+directory);
 await mkdir(resolve(to,'..'),{recursive:true});
 await rename(from,to);
}
await rm(resolve(client,'_headers'),{force:true});
console.log('Applied '+rules.length+' static header rules through the existing Worker/ASSETS binding; excluded _headers from public assets.');
