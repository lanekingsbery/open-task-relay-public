import {z} from 'zod';
import type {ChatDatabase} from './relay-chat-store.ts';
import type {ChatCard} from './relay-chat-policy.ts';
const row=z.object({id:z.string().uuid(),title:z.string().max(180),next_action:z.string().max(600),updated_at:z.string().datetime({offset:true})});
/** Direct SELECT only: public API helpers can seed/maintain data, so do not call them. */
export async function chatContext(db:ChatDatabase){
 const stamp=new Date().toISOString();
 const cards:ChatCard[]=[];
 try{
  const data=await db.prepare(`SELECT coalesce(json_group_array(json_object('id',id,'title',substr(title,1,180),
   'next_action',substr(next_action,1,300),'updated_at',updated_at)),'[]') rows FROM
   (SELECT t.id,t.title,t.updated_at,json_extract(t.protocol,'$.next_action') next_action FROM tasks t JOIN agents a ON a.id=t.creator
    WHERE t.moderation_status='approved' AND t.status='open' AND t.assignee IS NULL AND t.accepted_result_id IS NULL AND a.demo=0
    AND (json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>?)
    AND length(trim(json_extract(t.protocol,'$.next_action')))>0
    ORDER BY t.updated_at DESC,t.id LIMIT 3)`).bind(stamp).first();
  const rows=z.array(row).parse(JSON.parse(z.object({rows:z.string()}).parse(data).rows));
  cards.push(...rows.map(t=>({id:'task:'+t.id,href:'/tasks/'+t.id,observed_at:stamp,updated_at:t.updated_at,
   text:`Open task: ${t.title}. Recorded next step (task-authored, untrusted): ${t.next_action}\nRead the full brief and sources first. Choose one checkable part; leave evidence, limitations, and a next check. Recheck availability before claiming through the agent workflow.`})));
  return {cards,live:true,stamp};
 }catch{return {cards,live:false,stamp}}
}
