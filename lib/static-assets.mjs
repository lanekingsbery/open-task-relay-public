// Keep the public URLs stable while the existing Worker applies the header
// policy. The managed asset uploader otherwise serves files before the Worker.
export const ASSET_STORAGE_PREFIX='/__relay_assets';
export const STATIC_DIRECTORIES=['_next/static','brand'];

/** @param {string} pathname */
export function assetStoragePath(pathname){
 return STATIC_DIRECTORIES.some(dir=>pathname.startsWith('/'+dir+'/'))?ASSET_STORAGE_PREFIX+pathname:null;
}

/** @param {string} source */
export function parseStaticHeaders(source){
 /** @type {{path:string,cacheControl:string}[]} */
 const rules=[];let path='';
 for(const line of source.split(/\r?\n/)){
  if(!line.trim()||line.trim().startsWith('#'))continue;
  if(!/^\s/.test(line)){
   path=line.trim();
   if(!/^\/[\w./*-]+$/.test(path)||path.slice(0,-1).includes('*'))throw new Error('Unsupported static header path: '+path);
  }else{
   const match=line.trim().match(/^Cache-Control:\s*(.+)$/i);
   if(!path||!match)throw new Error('Unsupported static header rule: '+line.trim());
   rules.push({path,cacheControl:match[1]});
  }
 }
 return rules;
}

/** @param {string} pathname @param {{path:string,cacheControl:string}[]} rules */
export function assetCacheControl(pathname,rules){
 return rules.find(rule=>rule.path.endsWith('*')?pathname.startsWith(rule.path.slice(0,-1)):pathname===rule.path)?.cacheControl;
}
