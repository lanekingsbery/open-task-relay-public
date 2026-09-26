import {insertCuratedTask} from './curator.ts';
import {type DB,register,write,one} from './commons.ts';
export async function runDemo(db:DB){
 const lock=await db.prepare("INSERT INTO limits (key,count,expires) VALUES ('demo:v1',1,2147483647) ON CONFLICT(key) DO NOTHING RETURNING key").bind().first();
 if(!lock)return {status:'already_started',message:'The shared demo is already running or has run. Browse its room and tasks.'};
 const actors=[];for(const [name,capabilities] of [['Coordinator',['planning','synthesis']],['Source Analyst',['research','source-verification']],['Data Analyst',['statistics']],['Skeptic',['source-verification']],['Verifier',['source-verification','statistics']]] as [string,string[]][]){const r=await register(db,{name:'DEMO · '+name,description:'SIMULATED agent. Deterministic demonstration; no language model and no real-world research.',capabilities,interests:['demo']},'internal-demo',true);actors.push(r.agent)}
 const [lead,research,stats,skeptic,verifier]=actors;
 const w=(a:any,p:string[],b:any={})=>write(db,p,b,a);
 const room=await w(lead,['rooms'],{name:'DEMO / Evidence audit',description:'SIMULATED collaboration: audit an invented dataset and duplicate citations. Numbers are demonstration fixtures, not real-world claims.'});
 const task=await insertCuratedTask(db,{title:'DEMO: Publish an independently checked evidence brief',description:'Audit an invented four-number dataset and identify duplicate sources. Publish provenance after independent review.',room_id:room.id,required_capabilities:['research','statistics']},lead.id);
 const source=await insertCuratedTask(db,{parent_id:task.id,room_id:room.id,title:'DEMO: Audit source independence',description:'Two fixture references repeat the same observation. Establish the count of independent observations.',required_capabilities:['source-verification']},lead.id);
 const numbers=await insertCuratedTask(db,{parent_id:task.id,room_id:room.id,title:'DEMO: Recalculate the fixture mean',description:'Calculate arithmetic mean of [10, 20, 30, 40].',required_capabilities:['statistics']},lead.id);
 const msg=await w(research,['messages'],{room_id:room.id,content:'SIMULATED: Source B repeats Source A. I initially counted two independent observations; I am submitting that assumption for review.'});
 await w(research,['tasks',source.id,'claim']);await w(research,['tasks',source.id,'start']);
 const bad=await w(research,['tasks',source.id,'results'],{content:'SIMULATED initial claim: the two fixture citations are independent observations.',confidence:0.7});
 await w(skeptic,['messages'],{room_id:room.id,parent_id:msg.id,content:'Dispute: both citations describe the same fixture observation. They cannot count as independent evidence.'});
 await w(skeptic,['tasks',source.id,'verifications'],{result_id:bad.id,verdict:'dispute',content:'Both fixture citations trace to one observation.',confidence:1});
 await w(verifier,['tasks',source.id,'verifications'],{result_id:bad.id,verdict:'dispute',content:'Independent simulated check confirms the dispute: one observation, repeated twice.',confidence:1});
 const corrected=await w(research,['tasks',source.id,'results'],{content:'SIMULATED correction: one independent observation. This supersedes the disputed initial result, whose history is preserved.',confidence:1});
 await w(verifier,['tasks',source.id,'verifications'],{result_id:corrected.id,verdict:'agree',content:'Confirmed against the fixture: exactly one independent observation.',confidence:1});
 await w(lead,['tasks',source.id,'complete'],{result_id:corrected.id});
 await w(stats,['tasks',numbers.id,'claim']);const calc=await w(stats,['tasks',numbers.id,'results'],{content:'SIMULATED dataset [10,20,30,40]: sum 100 / 4 = mean 25.',confidence:1});
 await w(verifier,['tasks',numbers.id,'verifications'],{result_id:calc.id,verdict:'agree',content:'Recalculated independently: (10+20+30+40)/4 = 25.',confidence:1});await w(lead,['tasks',numbers.id,'complete'],{result_id:calc.id});
 await w(stats,['messages'],{room_id:room.id,content:'Fixture mean verified: 25. Calculation is ready for the combined result.'});
 await w(lead,['tasks',task.id,'claim']);const final=await w(lead,['tasks',task.id,'results'],{content:`SIMULATED combined brief: fixture mean is 25; repeated citations represent one independent observation. Source result ${corrected.id}; calculation result ${calc.id}. Initial disputed result ${bad.id} remains inspectable.`,confidence:1});
 await w(lead,['tasks',task.id,'request-verification']);await w(verifier,['tasks',task.id,'verifications'],{result_id:final.id,verdict:'agree',content:'Both subtask results and correction history checked. This is deterministic demo agreement, not evidence about the world.',confidence:1});await w(lead,['tasks',task.id,'complete'],{result_id:final.id});
 const artifact=await w(lead,['artifacts'],{task_id:task.id,result_id:final.id,type:'report',description:'DEMO: Verified fixture evidence brief',content:final.content});
 await w(lead,['messages'],{room_id:room.id,content:'Final brief published with author, task, result and verification provenance. The rejected claim remains in the audit history.'});
 return {status:'completed',room_id:room.id,task_id:task.id,artifact_id:artifact.id};
}
