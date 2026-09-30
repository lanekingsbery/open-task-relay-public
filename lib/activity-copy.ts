import {excerpt,humanCopy} from './human-copy.ts';

/** Display only: excerpts are from recorded text, never a generated summary. */
export function activityPreview(summary:string,limit=220){
 let text=summary;
 try{const value=JSON.parse(summary);if(value&&typeof value.summary==='string')text=value.summary}catch{}
 return excerpt(text.replace(/^#{1,6}\s+/gm,'').replace(/\[([^\]]+)\]\([^\s)]+\)/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1'),limit);
}
export function activityTitle(event:{task_id?:string;task_title?:string;actor_name?:string}){
 return event.task_title?humanCopy({id:event.task_id,title:event.task_title,description:''}).title:event.actor_name||'Public record';
}
export function activityDate(value:string){
 const date=new Date(value);
 return Number.isNaN(date.valueOf())?value:new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(date);
}
