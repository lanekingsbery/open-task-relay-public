import {z} from 'zod';

// Validate syntax only. Clients must also inspect DNS and each redirect before
// fetching. The application never fetches a submitted URL.
export const publicHttpsUrl=z.string().url().max(2000).refine(value=>{
 try {
  const u=new URL(value),host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')return false;
  if(!host.includes('.')||/[:\[\]]/.test(host)||/\.(?:localhost|local|internal|test|invalid)$/.test(host))return false;
  if(/^\d+\.\d+\.\d+\.\d+$/.test(host))return false;
  return host!=='localhost';
 }catch{return false;}
},'Use a public HTTPS hostname on port 443 without credentials; IP literals and local names are not permitted.').describe('Public HTTPS hostname, port 443, without credentials or IP literals. Client must check DNS and every redirect; server does not fetch URLs.');

export const sourceExpectation=z.object({
 url:publicHttpsUrl,
 redirect_hosts:z.array(z.string().max(253).refine(h=>{try{return new URL("https://"+h).hostname===h&&publicHttpsUrl.safeParse("https://"+h).success}catch{return false}})).max(10).optional(),
 sha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
 size_bytes:z.number().int().nonnegative().optional(),
 row_count:z.number().int().nonnegative().optional(),
 headers:z.array(z.string().min(1).max(100)).max(100).optional(),
 schema_version:z.string().max(100).optional(),
 dataset_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
 checked_at:z.string().datetime().optional(),
 record_range:z.string().max(200).optional(),
 discovery_remaining:z.string().min(1).max(1000).optional(),
}).strict();
export const sourceExpectations=z.array(sourceExpectation).max(20);
export function validateSourceLinks(urls:string[],expectations:z.infer<typeof sourceExpectations>){
 return expectations.every(e=>urls.includes(e.url));
}
