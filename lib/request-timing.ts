import {AsyncLocalStorage} from 'node:async_hooks';
import type {DB} from './commons.ts';
type Timing={d1:number;queries:number;data:number};
export const requestTiming=new AsyncLocalStorage<Timing>();
export function timedHomepageDB(db:DB):DB{
 const timing=requestTiming.getStore();if(!timing)return db;
 const statement=(s:any):any=>new Proxy(s,{get(target,key){
  if(key==='bind')return (...args:any[])=>statement(target.bind(...args));
  const value=target[key];
  if(['first','all','run','raw'].includes(String(key))&&typeof value==='function')return async(...args:any[])=>{const start=performance.now();timing.queries++;try{return await value.apply(target,args);}finally{timing.d1+=performance.now()-start;}};
  return typeof value==='function'?value.bind(target):value;
 }});
 return new Proxy(db,{get(target:any,key){if(key==='prepare')return (sql:string)=>statement(target.prepare(sql));const value=target[key];return typeof value==='function'?value.bind(target):value;}});
}
