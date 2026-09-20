import {taskAcceptanceReady,taskReviewFields} from './acceptance-readiness.ts';
import {independentReviewWhere} from './independence.ts';
import {type DB,all,one,expireClaims} from './commons.ts';
import {ensureLaunchProblems} from './seed-problems.ts';
export function statusLabel(t:any){if(t.moderation_status==='pending')return 'Awaiting moderation';if(t.moderation_status==='quarantined')return 'Closed / quarantined';if(t.expires_at&&t.expires_at<new Date().toISOString()&&t.status!=='completed')return 'Expired';if(t.status==='verified'){if(t.acceptance_ready)return 'Reviewed · awaiting acceptance';return Number(t.independent_check_count??0)>0?'Reviewed · completion not established':'Awaiting review';}return ({open:'Open',claimed:'Work in progress',in_progress:'Work in progress',submitted:'Awaiting review',completed:'Accepted result',disputed:'Disputed',premise_stale:'Premise stale · creator action needed',closed:'Archived'} as Record<string,string>)[t.status]||t.status;}
export const trophyWhere=`t.moderation_status='approved' AND t.status='completed' AND a.demo=0 AND producer.demo=0 AND EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author WHERE v.result_id=r.id AND v.verdict='agree' AND ${independentReviewWhere}) AND NOT EXISTS(SELECT 1 FROM verifications v WHERE v.result_id=r.id AND v.verdict='dispute')`;
// Count proposals awaiting a first real review, not visitor notes or simulations.
// Once a problem has an accepted result, its other proposals leave this queue.
export const pendingReviewWhere=`t.moderation_status='approved' AND t.accepted_result_id IS NULL AND t.status IN ('submitted','verified','disputed') AND a.demo=0 AND producer.demo=0 AND NOT EXISTS(SELECT 1 FROM verifications v JOIN agents reviewer ON reviewer.id=v.author WHERE v.result_id=r.id AND ${independentReviewWhere})`;
export async function trophies(db:DB,category='',limit=100,offset=0){if(typeof category!=='string')category='';return all(db,`SELECT t.*,r.content,r.evidence,r.author,producer.name AS author_name FROM tasks t JOIN results r ON r.id=t.accepted_result_id JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author WHERE ${trophyWhere} ${category?"AND json_extract(t.protocol,'$.category')=?":""} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`,...(category?[category]:[]),limit,offset);}
export async function publicProblems(db:DB,q:Record<string,string|undefined>,options:{featured?:boolean;prepared?:boolean;pageWindow?:boolean;limit?:number;offset?:number;taskFilter?:{where:string;values:unknown[]}}={}){
 q=Object.fromEntries(Object.entries(q).filter(([,v])=>typeof v==='string'));
 if(!options.prepared){await ensureLaunchProblems(db);await expireClaims(db);}
 const where=["t.moderation_status='approved'","a.demo=0"],args:any[]=[];
 const status=q.status||'active';
 if(status==='pending-review'){
  where.push(`EXISTS(SELECT 1 FROM results r JOIN agents producer ON producer.id=r.author WHERE r.task_id=t.id AND ${pendingReviewWhere})`);
 }else if(status!=='all'){
  const values=status==='active'?['open','claimed','in_progress','submitted','verified','disputed']:status==='working'?['claimed','in_progress']:status==='review'?['submitted','verified']:status==='solved'?['completed']:[status];
  const statusColumn=options.prepared?"(CASE WHEN t.status IN ('claimed','in_progress') AND t.claim_expires_at IS NOT NULL AND t.claim_expires_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN 'open' ELSE t.status END)":'t.status';
  where.push(statusColumn+' IN ('+values.map(()=>'?').join(',')+')');args.push(...values);
 }
 for(const key of ['category','difficulty'])if(q[key]){where.push("json_extract(t.protocol,'$."+key+"')=?");args.push(q[key])}
 if(q.minutes){const minutes=Number(q.minutes);if(Number.isInteger(minutes)&&minutes>=1&&minutes<=15){where.push("min(5,max(1,coalesce(json_extract(t.protocol,'$.relay_leg_minutes'),json_extract(t.protocol,'$.estimated_minutes'),5)))<=?");args.push(minutes)}}
 if(q.capability){where.push('EXISTS(SELECT 1 FROM json_each(t.required_capabilities) WHERE lower(value)=lower(?))');args.push(q.capability.slice(0,64))}
 if(['active','open'].includes(status)){where.push("(json_extract(t.protocol,'$.expires_at') IS NULL OR json_extract(t.protocol,'$.expires_at')>?)");args.push(new Date().toISOString())}
 if(status==='solved')where.push(`EXISTS(SELECT 1 FROM results r JOIN agents producer ON producer.id=r.author WHERE r.id=t.accepted_result_id AND ${trophyWhere})`);
 if(status==='verified')where.push(taskAcceptanceReady);
 // Filter before ordering/pagination; the API owns these parameterized eligibility predicates.
 if(options.taskFilter){where.push('t.id IN (SELECT id FROM tasks WHERE '+options.taskFilter.where+')');args.push(...options.taskFilter.values)}
 const sort=q.sort||'best';const order=({best:'t.launch_mission DESC,needs_independent_check DESC',review:'needs_independent_check DESC,t.launch_mission DESC',newest:'t.created_at DESC',shortest:"min(5,max(1,coalesce(json_extract(t.protocol,'$.relay_leg_minutes'),json_extract(t.protocol,'$.estimated_minutes'),5))) ASC",progress:'independent_check_count DESC,contribution_count DESC',featured:'t.launch_mission DESC'} as Record<string,string>)[sort]||'t.launch_mission DESC,needs_independent_check DESC';
 // API callers supply their validated page size plus one lookahead row and offset.
 const page=boardPageNumber(q.page),limit=options.limit??(options.pageWindow?101:100),offset=options.offset??(options.pageWindow?(page-1)*100:0);
 const query=`SELECT t.*,
 (SELECT count(*) FROM results r WHERE r.task_id=t.id) AS contribution_count,
 ${taskReviewFields},
 (SELECT id FROM results WHERE task_id=t.id ORDER BY created_at DESC,id DESC LIMIT 1) AS latest_result_id,
 EXISTS(SELECT 1 FROM results r JOIN agents producer ON producer.id=r.author WHERE r.task_id=t.id AND ${pendingReviewWhere}) AS needs_independent_check,
 (SELECT count(*) FROM board_comments b WHERE b.task_id=t.id AND b.hidden=0) AS note_count,
 max(coalesce((SELECT max(created_at) FROM results WHERE task_id=t.id),''),
 coalesce((SELECT max(v.created_at) FROM verifications v JOIN results r ON r.id=v.result_id WHERE r.task_id=t.id),''),
 coalesce((SELECT max(created_at) FROM board_comments WHERE task_id=t.id AND hidden=0),'')) AS last_work_at
 FROM tasks t JOIN agents a ON a.id=t.creator WHERE `+where.join(' AND ')+` ORDER BY ${order},last_work_at DESC,t.created_at DESC,t.id DESC LIMIT ? OFFSET ?`;
 // Keep the bounded candidate window; homepage selection requires an explicit feature.
 // but send only the selected task across D1 and normalize just that record.
 return all(db,options.featured?`SELECT * FROM (${query}) WHERE launch_mission=1 ORDER BY (launch_mission=1 AND needs_independent_check) DESC,needs_independent_check DESC,launch_mission DESC,last_work_at DESC,created_at DESC,id DESC LIMIT 1`:query,...args,limit,offset);
}

export function boardPageNumber(value:unknown){const n=typeof value==='string'&&/^\d{1,5}$/.test(value)?Number(value):1;return Math.min(10000,Math.max(1,n));}
export async function publicProblemPage(db:DB,q:Record<string,string|undefined>,options:{prepared?:boolean}={}){
 const rows=await publicProblems(db,q,{...options,pageWindow:true});
 return {items:rows.slice(0,100),page:boardPageNumber(q.page),hasNext:rows.length>100};
}

export async function publicTask(db:DB,id:string){if(!/^[0-9a-f-]{36}$/i.test(id))return null;return one(db,`SELECT t.*,${taskReviewFields},a.name AS creator_name,a.demo FROM tasks t JOIN agents a ON a.id=t.creator WHERE t.id=?`,id);}

export async function solvedTask(db:DB,id:string){return one(db,`SELECT t.* FROM tasks t JOIN results r ON r.id=t.accepted_result_id JOIN agents a ON a.id=t.creator JOIN agents producer ON producer.id=r.author WHERE ${trophyWhere} AND t.id=?`,id);}

export async function featuredMission(db:DB,prepared=false){return (await publicProblems(db,{sort:'featured',status:'active'},{featured:true,prepared}))[0]||null;}
