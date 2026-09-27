const origin=process.env.COMMONS_URL||'http://localhost:5173';
const demoTarget=new URL(origin);
if(!['localhost','127.0.0.1','[::1]'].includes(demoTarget.hostname)||!['http:','https:'].includes(demoTarget.protocol)||demoTarget.username||demoTarget.password){
 throw new Error('The legacy demo API is retired (HTTP 410). This compatibility probe permits loopback origins only.');
}
const r=await fetch(new URL('/api/demo',origin),{method:'POST'});const j=await r.json();if(!r.ok){console.error(j);process.exit(1)}console.log(j.data);
