// Bounded, isolate-local public projections. Never used by API reads or auth.
export const PUBLIC_CACHE_MS=5_000;
type Entry={expires:number;pending:Promise<unknown>};
const snapshots=new WeakMap<object,Map<string,Entry>>();
export function invalidatePublicData(db:object){snapshots.delete(db);}
export async function publicData<T>(db:object,key:string,load:()=>Promise<T>):Promise<T>{
 let entries=snapshots.get(db);if(!entries){entries=new Map();snapshots.set(db,entries);}
 const cached=entries.get(key);if(cached&&cached.expires>Date.now())return cached.pending as Promise<T>; // A cache key has one caller-owned result type.
 // Bound user-controlled filter combinations and memory; TTL starts before work.
 if(entries.size>=64)entries.clear();
 const entry={expires:Date.now()+PUBLIC_CACHE_MS,pending:Promise.resolve().then(load)};
 entries.set(key,entry);
 try{return await entry.pending;}catch(error){if(entries.get(key)===entry)entries.delete(key);throw error;}
}
