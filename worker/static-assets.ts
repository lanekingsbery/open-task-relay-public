import {assetStoragePath,assetCacheControl,parseStaticHeaders} from '../lib/static-assets.mjs';

declare const __STATIC_ASSET_HEADERS__:string;
const rules=parseStaticHeaders(__STATIC_ASSET_HEADERS__);

export async function staticAssetResponse(request:Request,assets:Fetcher):Promise<Response|null>{
 const url=new URL(request.url);
 // _headers is build configuration, never a public download.
 if(url.pathname==='/_headers')return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
 const storagePath=assetStoragePath(url.pathname);
 if(!storagePath||!['GET','HEAD'].includes(request.method))return null;
 const cacheControl=assetCacheControl(url.pathname,rules);
 url.pathname=storagePath;
 const response=await assets.fetch(new Request(url,request));
 if(response.status===404)return null;
 const headers=new Headers(response.headers);
 if(cacheControl&&[200,304].includes(response.status)&&!request.headers.has('authorization')&&!request.headers.has('range')&&!headers.has('set-cookie'))headers.set('Cache-Control',cacheControl);
 return new Response(request.method==='HEAD'||response.status===304?null:response.body,{status:response.status,statusText:response.statusText,headers});
}
