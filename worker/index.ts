import {withIndexNow,indexNowVerificationResponse} from '../lib/indexnow';
import {indexNowConfig} from '../lib/indexnow-config';
import {homepageEdge,invalidateHomepageHTML} from './homepage-edge';
import {operationalResponse,type OperationsEnv} from './operations';
import {ownerRequest,type OwnerEnv} from './owner-access';
import {publicPage} from './public-pages';
import {transportOrigin,CANONICAL_ORIGIN,STAGING_ORIGIN} from '../lib/origin';
import {DISCOVERY_LISTINGS} from '../lib/project-links';
import {invalidateHomepage} from '../lib/homepage-cache';
import {staticAssetResponse} from './static-assets';
import {assetStoragePath} from '../lib/static-assets.mjs';
/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import {registryProof} from "../lib/registry-proof";
import {GET as agentCard} from "../app/.well-known/agent-card.json/route";
import handler from "vinext/server/app-router-entry";

const discoveryDocuments=new Set(['/skill.md','/agents.json','/openapi.json','/egress.json']);
const publicMachineReads=new Set([...discoveryDocuments,'/api/tasks','/api/solved','/api/reviews','/api/health']);

interface Env extends OwnerEnv, OperationsEnv {
  INDEXNOW_KEY?: string;
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const application = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if(url.pathname === "/.well-known/mcp-registry-auth") return new Response(registryProof||null,{status:registryProof?200:404,headers:{"Content-Type":"text/plain","Cache-Control":"public, max-age=300"}});
    if (url.pathname === "/.well-known/agent-card.json") return agentCard(request);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(assetStoragePath(path)||path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

const routed = {
  async fetch(request:Request, env:Env, ctx:ExecutionContext):Promise<Response>{
    const asset=await staticAssetResponse(request,env.ASSETS);
    if(asset)return asset;
    const url=new URL(request.url);
    const pagePath=url.pathname.endsWith('.rsc')?url.pathname.slice(0,-4):url.pathname;
    const safeNavigation=['GET','HEAD'].includes(request.method)&&!request.headers.has('authorization');
    if(url.pathname==='/problems'||url.pathname==='/problems/'){
      if(!safeNavigation)return Response.json({error:{code:'CANONICAL_PATH_REQUIRED',message:'Use /tasks for task requests.'}},{status:421});
      return Response.redirect(CANONICAL_ORIGIN+'/tasks'+url.search,301);
    }
    const canonicalError=()=>Response.json({error:{code:'CANONICAL_ORIGIN_REQUIRED',message:'Use https://opentaskrelay.org for authenticated requests and writes.'}},{status:421});
    if(['opentaskrelay.com','www.opentaskrelay.com','www.opentaskrelay.org','agent-commons.lanekingsbery.chatgpt.site'].includes(url.hostname)){
      if(!safeNavigation)return canonicalError();
      url.hostname='opentaskrelay.org';url.protocol='https:';return Response.redirect(url.href,301);
    }
    if(url.hostname==='opentaskrelay.org'&&url.protocol==='http:'){
      url.protocol='https:';return Response.redirect(url.href,308);
    }
    // A normal HTTP refresh explicitly bypasses the short public projection cache.
    // This also permits production freshness checks without creating records.
    const refreshPublic=['/','/tasks','/activity'].includes(pagePath)&&['GET','HEAD'].includes(request.method)&&/(?:no-cache|no-store|max-age=0)/i.test(request.headers.get('cache-control')||'');
    if(refreshPublic)invalidateHomepage(env.DB);
    const started=performance.now();
    const response=request.method==='OPTIONS'&&discoveryDocuments.has(url.pathname)
      ?new Response(null,{status:204,headers:{'Allow':'GET, HEAD, OPTIONS','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Accept','Access-Control-Max-Age':'600'}})
      :await application.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    if(refreshPublic)headers.set('X-Relay-Data-Cache','refreshed');
    // Successful writes in this isolate refresh the homepage immediately;
    // Other locations retain their bounded public snapshot until expiry.
    if(!['GET','HEAD','OPTIONS'].includes(request.method)&&response.ok){invalidateHomepage(env.DB);ctx.waitUntil(invalidateHomepageHTML(CANONICAL_ORIGIN));}
    if((['/','/tasks','/activity','/agent-guide'].includes(pagePath)||pagePath.startsWith('/tasks/'))&&['GET','HEAD'].includes(request.method)){
      // Render each response normally; cache only the public D1 projection.
      // No shared HTML cache can mix framework RSC or authenticated variants.
      if(pagePath!=='/agent-guide')headers.set('Cache-Control','no-store');
      headers.append('Server-Timing',`app;dur=${(performance.now()-started).toFixed(1)}`);
    }
    if(['GET','HEAD'].includes(request.method)&&response.status===200&&!request.headers.has('authorization')&&!headers.has('set-cookie')){
      if(/^\/_next\/static\//.test(url.pathname)||/^\/brand\/[^/]+\.[a-f0-9]{12}\.(webp|png)$/.test(url.pathname))headers.set('Cache-Control','public, max-age=31536000, immutable');
      else if(/^\/brand\/[^/]+\.(webp|png)$/.test(url.pathname))headers.set('Cache-Control','public, max-age=86400, must-revalidate');
    }
    if(publicMachineReads.has(url.pathname)&&['GET','HEAD'].includes(request.method)){
      // Public discovery is client-neutral. Edge firewall policy is configured
      // by the hosting operator, before this Worker receives a request.
      headers.set('Access-Control-Allow-Origin','*');
      if(discoveryDocuments.has(url.pathname))headers.set('Cache-Control',response.status===200&&!request.headers.has('authorization')&&!headers.has('set-cookie')?'public, max-age=300':'private, no-store');
      // API reads retain their existing no-store and 240/minute rate limit.
    }
    if(request.headers.has('authorization')||request.headers.has('cookie')||request.headers.has('cf-access-jwt-assertion')||headers.has('set-cookie')||['/my-problems','/api/problems','/submit','/moderation','/api/moderation'].some(p=>pagePath===p||pagePath.startsWith(p+'/')))headers.set('Cache-Control','private, no-store');
    const origin=transportOrigin(request.url);
    headers.append('Link',`<${origin}/skill.md>; rel="service-doc"; type="text/plain", <${origin}/openapi.json>; rel="service-desc"; type="application/json", <${origin}/agents.json>; rel="alternate"; type="application/json"`);
    headers.set('Access-Control-Expose-Headers','Link, Retry-After');
    headers.set('Strict-Transport-Security','max-age=31536000');
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Referrer-Policy','no-referrer');
    headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    // Only Source embeds these provider images. Allow exact image paths, not
    // provider-wide origins, scripts, connections, frames, or image proxies.
    const discoveryBadgeSources=pagePath.replace(/\/$/,'')==='/source'?DISCOVERY_LISTINGS.flatMap(listing=>listing.badge?[listing.badge.src]:[]).join(' '):'';
    headers.set('Content-Security-Policy',`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://github.com/lanekingsbery/open-task-relay-public/actions/workflows/ci.yml/badge.svg${discoveryBadgeSources?' '+discoveryBadgeSources:''}; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
};

export default {async fetch(request:Request,env:Env,ctx:ExecutionContext){
  const operational=await operationalResponse(request,env);
  if(operational)return operational;
  const checked=await ownerRequest(request,env);
  if(checked instanceof Response)return checked;
  request=checked;
  const indexing=STAGING_ORIGIN||env.RELAY_SELF_HOSTED!=='true'?null:indexNowConfig(env);
  const verification=indexNowVerificationResponse(request,indexing);
  if(verification)return verification;
  if(STAGING_ORIGIN){
    const url=new URL(request.url);
    const stagingHeaders={'X-Robots-Tag':'noindex, nofollow, noarchive','X-Relay-Environment':'staging','Cache-Control':'no-store'};
    if(url.origin!==STAGING_ORIGIN)return new Response('Staging origin required',{status:421,headers:stagingHeaders});
    if(url.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:{...stagingHeaders,'Content-Type':'text/plain'}});
    if(['/moderation','/api/moderation','/signin-with-chatgpt','/signout-with-chatgpt','/callback','/.well-known/mcp-registry-auth'].some(p=>url.pathname===p||url.pathname.startsWith(p+'/')))return new Response('Unavailable on staging',{status:403,headers:stagingHeaders});
    const headers=new Headers(request.headers);
    for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
    request=new Request(request,{headers});
  }
  const response=await withIndexNow(request,ctx,indexing,()=>homepageEdge(request,()=>publicPage(request,()=>routed.fetch(request,env,ctx),ctx),ctx));
  if(!STAGING_ORIGIN)return response;
  const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex, nofollow, noarchive');headers.set('X-Relay-Environment','staging');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
