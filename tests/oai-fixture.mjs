import {testDatabase} from './test-db.mjs';

// Invented local records only. No application reader, seeding or paid services.
export async function oaiFixture(db=testDatabase(),options={}){
 const stamp='2026-09-01T10:11:12.000Z';
 const owner=crypto.randomUUID(),producer=crypto.randomUUID(),reviewer=crypto.randomUUID();
 const taskId=crypto.randomUUID(),resultId=crypto.randomUUID(),reviewId=crypto.randomUUID();
 for(const [id,name,managed] of [[owner,'Synthetic task owner',0],[producer,'Fixture agent & <Robot> 雪 😀',options.siteRun?1:0],[reviewer,'Synthetic reviewer',0]]){
  await db.prepare(`INSERT INTO agents(id,created_at,last_seen,name,description,capabilities,interests,token_hash,managed)
   VALUES(?,?,?,?,'PRIVATE_PROFILE_SENTINEL','[]','[]',?,?)`).bind(id,stamp,stamp,name,'synthetic-hash-'+id,managed).run();
 }
 const protocol=JSON.stringify({category:'research',license:options.license||'CC-BY-4.0',revision:1});
 await db.prepare(`INSERT INTO tasks(id,created_at,updated_at,creator,assignee,title,description,required_capabilities,protocol,status,moderation_status)
  VALUES(?,?,?,?,?,'Synthetic report & <雪>','Task context','[]',?,'verified','approved')`).bind(taskId,stamp,stamp,owner,producer,protocol).run();
 await db.prepare(`INSERT INTO results(id,created_at,task_id,author,content,evidence,validation,contract_revision)
  VALUES(?,?,?,?,'Synthetic findings. Limitations: local examples only. Unicode: 雪 😀 < > & " ',?,'{"passed":true}',1)`)
  .bind(resultId,stamp,taskId,producer,JSON.stringify(['https://example.org/source?a=1&b=2'])).run();
 await db.prepare(`INSERT INTO verifications(id,created_at,result_id,author,verdict,completeness,content,evidence,confidence)
  VALUES(?,?,?,?,'agree',?,'Local review with explicit limitations','[]',0.8)`).bind(reviewId,stamp,resultId,reviewer,options.completeness||'complete').run();
 if(options.snapshot!==false)await db.prepare('INSERT INTO acceptance_snapshots(result_id,task_id,created_at,revision,protocol) VALUES(?,?,?,1,?)').bind(resultId,taskId,stamp,protocol).run();
 await db.prepare("INSERT INTO events(id,created_at,actor,action,entity_id,entity_type,summary) VALUES(?,?,?,'completed',?,'tasks','PRIVATE_AUDIT_SENTINEL')").bind(crypto.randomUUID(),stamp,owner,taskId).run();
 if(options.accept!==false)await db.prepare("UPDATE tasks SET status='completed',accepted_result_id=? WHERE id=?").bind(resultId,taskId).run();
 return {db,owner,producer,reviewer,taskId,resultId,reviewId};
}
