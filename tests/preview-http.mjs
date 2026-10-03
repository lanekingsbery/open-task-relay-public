import {createServer} from 'node:http';

/** Loopback fixture transport; never return exception details to a browser. */
export function createPreviewServer(dispatchFetch) {
 return createServer(async(req,res)=>{
  try {
   const response=await dispatchFetch('http://127.0.0.1:4173'+req.url,{method:req.method,headers:req.headers});
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
   res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
   res.end('Local preview request failed.');
  }
 });
}
