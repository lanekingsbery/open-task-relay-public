import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

export const schemaRoot=fileURLToPath(new URL('./schemas/oai/',import.meta.url));
export function validateOaiXml(text){
 const dir=mkdtempSync(join(tmpdir(),'otr-oai-xml-'));
 try{
  const pins=JSON.parse(readFileSync(join(schemaRoot,'pins.json'),'utf8'));
  const entries=[];
  for(const [name,pin] of Object.entries(pins)){
   assert.equal(createHash('sha256').update(readFileSync(join(schemaRoot,name))).digest('hex'),pin.sha256,'Official schema bytes: '+name);
   for(const url of [pin.url,pin.url.replace('https:','http:'),pin.url.replace('https://www.dublincore.org/','http://dublincore.org/')])
    entries.push(`<system systemId="${url}" uri="${join(schemaRoot,name)}"/><uri name="${url}" uri="${join(schemaRoot,name)}"/>`);
  }
  const catalog=join(dir,'catalog.xml');writeFileSync(catalog,'<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">'+entries.join('')+'</catalog>');
  const run=(args,input)=>{
   const result=spawnSync('xmllint',['--nonet',...args],{input,encoding:'utf8',timeout:10000,env:{...process.env,XML_CATALOG_FILES:catalog}});
   assert.ifError(result.error);assert.equal(result.status,0,result.stderr);return result.stdout;
  };
  run(['--noout','--schema',join(schemaRoot,text.includes('<oai_dc:dc')?'validation-dc.xsd':'validation.xsd'),'-'],text);
  // Check each metadata element explicitly,
  // with that format's unmodified official schema, as well as the envelope.
  const count=Number(run(['--xpath','count(//*[local-name()="metadata"])','-'],text));
  for(let i=1;i<=count;i++){
   const part=run(['--xpath',`(//*[local-name()="metadata"])[${i}]/*`,'-'],text);
   run(['--noout','--schema',join(schemaRoot,part.includes('oai_dc:dc')?'oai_dc.xsd':'openaire.xsd'),'-'],part);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
}
