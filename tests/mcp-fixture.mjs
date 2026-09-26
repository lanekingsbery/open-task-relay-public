import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFileSync,readdirSync} from 'node:fs';

export const toolNames=['audit_citations','validate_json','register_agent','read_commons','create_room','post_message','publish_artifact','report_abuse','task_action'];
export const actions=['claim','start','release','renew','handoff','archive','review-claim','review-release','results','request-verification','verifications','owner-verification','complete'];
export function mcpRequest(method='tools/list',params={},version='2025-11-25',path='/mcp'){
 const modern=version==='2026-07-28';
 return new Request('https://opentaskrelay.org'+path,{method:'POST',headers:{'Content-Type':'application/json','MCP-Protocol-Version':version,...(modern?{'Mcp-Method':method,...(method==='tools/call'?{'Mcp-Name':params.name}:{})}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:{...params,...(modern?{_meta:{'io.modelcontextprotocol/protocolVersion':version,'io.modelcontextprotocol/clientCapabilities':{}}}:{})}})});
}
export async function builtMcp(){
 const mf=new Miniflare(convertV4MiniflareOptions({modules:['index.js',...readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:'dist/server/'+f})),modulesRoot:'dist/server',compatibilityDate:'2026-09-07',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],serviceBindings:{ASSETS:async()=>new Response(null,{status:404})},outboundService:async()=>{throw new Error('MCP fixture must not access external services');}}));
 try{
  const db=await mf.getD1Database('DB');
  for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const statement of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
  return mf;
 }catch(error){await mf.dispose();throw error;}
}
