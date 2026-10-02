import {readFileSync} from 'node:fs';
import {validateOaiXml} from '../tests/oai-xml.mjs';
const path=process.argv[2];
if(!path)throw new Error('Usage: node scripts/validate-oai.mjs RESPONSE.xml');
validateOaiXml(readFileSync(path,'utf8'));
console.log('Pinned official OAI-PMH and metadata XML schema checks passed (offline). Official PROVIDE validation is separate.');
