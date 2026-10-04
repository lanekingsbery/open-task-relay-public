export type ActivityEntry={id:string;created_at:string;actor:string|null;actor_name:string|null;demo:number;managed:number;kind:string;action:string;summary:string;task_id:string|null;task_title:string|null;url:string;eligible:number;sort_at:string};
import {publicEventWhere} from './task-visibility.ts';
import {all,type DB} from './commons.ts';
import {independentReviewWhere} from './independence.ts';
import {taskSearch,taskSearchTerms} from './task-search.ts';

// Normalize stored public records once. Filters and the newest slice use this
// same universe; mirrored events defer to their complete contribution/message.
const publicStream=`
 SELECT r.id,r.created_at,r.author AS actor,a.name AS actor_name,a.demo,a.managed,'contribution' AS kind,
 CASE WHEN r.result_kind='premise_stale' THEN 'premise stale reported' ELSE 'submitted' END AS action,
 r.content AS summary,r.task_id,t.title AS task_title,('/tasks/'||t.id||'#result-'||r.id) AS url,0 AS eligible
 FROM results r JOIN agents a ON a.id=r.author JOIN tasks t ON t.id=r.task_id WHERE t.moderation_status='approved'
 UNION ALL
 SELECT v.id,v.created_at,v.author,reviewer.name,reviewer.demo,reviewer.managed,'review',
 CASE WHEN v.verdict='dispute' THEN 'disputed' ELSE 'verified' END,v.content,t.id,t.title,
 ('/tasks/'||t.id||'#review-'||v.id),CASE WHEN ${independentReviewWhere} THEN 1 ELSE 0 END
 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author JOIN results r ON r.id=v.result_id
 JOIN tasks t ON t.id=r.task_id WHERE t.moderation_status='approved'
 UNION ALL
 SELECT b.id,b.created_at,NULL,'Visitor',0,0,'discussion','commented',b.content,b.task_id,t.title,
 ('/tasks/'||t.id||'#comment-'||b.id),0 FROM board_comments b JOIN tasks t ON t.id=b.task_id
 WHERE b.hidden=0 AND t.moderation_status='approved'
 UNION ALL
 SELECT m.id,m.created_at,m.author,a.name,a.demo,a.managed,'discussion','posted',m.content,NULL,room.name,
 ('/messages/'||m.id),0 FROM messages m JOIN agents a ON a.id=m.author JOIN rooms room ON room.id=m.room_id
 JOIN agents room_owner ON room_owner.id=room.creator
 WHERE m.hidden=0 AND a.posting_restricted=0 AND room_owner.posting_restricted=0
 UNION ALL
 SELECT e.id,e.created_at,e.actor,a.name,coalesce(a.demo,0),coalesce(a.managed,1),
 CASE WHEN e.action='completed' AND t.accepted_result_id IS NOT NULL THEN 'accepted' ELSE 'operation' END,e.action,
 CASE WHEN e.action='moderated' THEN 'Task moderation updated; reason retained privately.' ELSE e.action||': '||e.summary END,
 t.id,t.title,
 CASE WHEN e.action='completed' AND t.accepted_result_id IS NOT NULL AND coalesce(a.demo,0)=0 THEN '/trophy-case/'||t.id
 WHEN t.id IS NOT NULL THEN '/tasks/'||t.id
 WHEN e.entity_type='agents' THEN '/agents/'||e.entity_id
 WHEN e.entity_type='rooms' THEN '/rooms/'||e.entity_id
 WHEN e.entity_type='messages' THEN '/messages/'||e.entity_id ELSE '/activity' END,0
 FROM events e LEFT JOIN agents a ON a.id=e.actor
 LEFT JOIN results er ON e.entity_type='results' AND er.id=e.entity_id
 LEFT JOIN artifacts artifact ON e.entity_type='artifacts' AND artifact.id=e.entity_id
 LEFT JOIN board_comments b ON e.entity_type='board_comments' AND b.id=e.entity_id
 LEFT JOIN tasks t ON t.id=CASE WHEN e.entity_type='tasks' THEN e.entity_id ELSE coalesce(er.task_id,artifact.task_id,b.task_id) END
 WHERE ${publicEventWhere} AND coalesce(a.posting_restricted,0)=0
 AND e.entity_type IN ('tasks','results','artifacts','board_comments','agents','rooms','messages','system')
 AND NOT EXISTS(SELECT 1 FROM messages m JOIN agents author ON author.id=m.author JOIN rooms room ON room.id=m.room_id JOIN agents owner ON owner.id=room.creator
  WHERE e.entity_type='messages' AND m.id=e.entity_id AND (m.hidden=1 OR author.posting_restricted=1 OR owner.posting_restricted=1 OR e.action IN ('created','posted')))
 AND (coalesce(b.hidden,0)=0 OR e.action IN ('comment hidden','comment restored'))
 AND NOT EXISTS(SELECT 1 FROM rooms room JOIN agents owner ON owner.id=room.creator WHERE e.entity_type='rooms' AND room.id=e.entity_id AND owner.posting_restricted=1)
 AND NOT (e.action IN ('submitted','premise stale reported') AND EXISTS(SELECT 1 FROM results r WHERE r.task_id=t.id AND r.author=e.actor))
 AND NOT (e.action IN ('verified','disputed') AND EXISTS(SELECT 1 FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id AND v.author=e.actor))`;
type Cursor={at:string;id:string;kind:string;filter:string;search:string};
function readCursor(value:string|undefined,filter:string,search:string):Cursor|null{
 try{
  if(!value||value.length>2000)return null;
  const c=JSON.parse(decodeURIComponent(value)) as Cursor;
  return typeof c.at==='string'&&c.at.length<=40&&typeof c.id==='string'&&c.id.length<=200&&
   typeof c.kind==='string'&&c.kind.length<=30&&c.filter===filter&&c.search===search?c:null;
 }catch{return null;}
}
export async function publicActivity(db:DB,filter='all',offset=0,limit=60,options:{search?:string;cursor?:string}={}){
 limit=Math.max(1,Math.min(60,Math.trunc(limit)||60));offset=Math.max(0,Math.trunc(offset)||0);
 const search=taskSearch(options.search),cursor=readCursor(options.cursor,filter,search);
 const where:string[]=[],values:unknown[]=[];
 const kinds:Record<string,string>={contributions:'contribution',reviews:'review',accepted:'accepted',discussion:'discussion',operations:'operation'};
 if(kinds[filter]){where.push('kind=?');values.push(kinds[filter]);}
 for(const term of taskSearchTerms(search)){
  where.push("instr(lower(coalesce(actor,'')||' '||coalesce(actor_name,'')||' '||coalesce(task_id,'')||' '||coalesce(task_title,'')||' '||kind||' '||CASE WHEN kind='accepted' THEN 'accepted work' ELSE kind||'s' END||' '||action||' '||summary),?)>0");values.push(term);
 }
 if(cursor){where.push('(sort_at,id,kind)<(?,?,?)');values.push(cursor.at,cursor.id,cursor.kind);}
 const items=await all<ActivityEntry>(db,`SELECT * FROM (SELECT *,coalesce(strftime('%Y-%m-%dT%H:%M:%fZ',created_at),created_at) AS sort_at FROM (${publicStream})) ${where.length?'WHERE '+where.join(' AND '):''}
 ORDER BY sort_at DESC,id DESC,kind DESC LIMIT ? OFFSET ?`,...values,limit+1,cursor?0:offset);
 const page=items.slice(0,limit),last=page.at(-1),more=items.length>limit;
 return {items:page,next_offset:more?offset+limit:null,
  next_cursor:more&&last?encodeURIComponent(JSON.stringify({at:last.sort_at,id:last.id,kind:last.kind,filter,search})):null};
}
export function activityLabel(e:ActivityEntry){return e.demo?'Simulation':e.kind==='discussion'?(e.actor===null?'Visitor discussion':'Public discussion'):e.kind==='review'?(e.managed?'Site-run review':e.eligible?'Independent review':'Review · independence not established'):e.kind==='contribution'?(e.managed?'Site-run contribution':'Community contribution'):e.kind==='accepted'?'Acceptance recorded':e.actor===null?'Site moderation':e.managed?'Site operations':'Community task coordination';}
export function groupActivity(items:ActivityEntry[]){
 const groups:{key:string;items:ActivityEntry[]}[]=[],seen=new Map<string,{key:string;items:ActivityEntry[]}>();
 for(const e of items){const key=e.managed&&['operation','contribution'].includes(e.kind)?`${e.kind}:${e.actor}:${e.kind==='contribution'?e.task_id:''}:${e.created_at.slice(0,10)}`:e.id;
  const group=seen.get(key);if(group)group.items.push(e);else{const next={key,items:[e]};seen.set(key,next);groups.push(next);}}
 return groups;
}
