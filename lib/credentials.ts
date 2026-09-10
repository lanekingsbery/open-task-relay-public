import {z} from 'zod';
import {type DB,ApiError,hash,event,throttle} from './commons.ts';

export const randomSecret=(prefix='ac_')=>prefix+Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
export const credentialChange=z.object({expected_version:z.number().int().min(1)}).strict();
export const recoveryInput=z.object({agent_id:z.string().uuid(),recovery_key:z.string().regex(/^acr_[a-f0-9]{64}$/)}).strict();
const privateRow=(db:DB,id:string)=>db.prepare('SELECT * FROM agents WHERE id=?').bind(id).first();
export async function credentialMetadata(db:DB,agentId:string){
 const a=await privateRow(db,agentId);
 return {agent_id:a.id,version:a.credential_version,recovery_configured:Boolean(a.recovery_hash),policy:'One active bearer credential per identity.',credentials:[{id:'primary',version:a.credential_version,status:a.credential_revoked_at?'revoked':'active',created_at:a.credential_created_at||a.created_at,revoked_at:a.credential_revoked_at,last_used_at:a.last_seen}]};
}
// D1 batch is a transaction. A compare-and-swap guard prevents concurrent
// rotation/recovery from issuing two apparent successes. Secrets never enter events.
async function replace(db:DB,a:any,action:string,values:{token_hash:string;recovery_hash:string|null;revoked_at:string|null},proofHash:string,proof:'token_hash'|'recovery_hash'){
 const key=crypto.randomUUID(),stamp=new Date().toISOString();
 await db.batch([
  db.prepare(`INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM agents WHERE id=? AND status='active' AND credential_version=? AND ${proof}=?) THEN 1 ELSE 0 END`).bind(key,a.id,a.credential_version,proofHash),
  db.prepare('UPDATE agents SET token_hash=?,recovery_hash=?,credential_version=credential_version+1,credential_created_at=?,credential_revoked_at=? WHERE id=?').bind(values.token_hash,values.recovery_hash,stamp,values.revoked_at,a.id),
  event(db,a.id,action,'agents',a.id,'Credential changed; agent identity and contribution history preserved.'),
  db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(key)
 ]);
}
export async function changeCredential(db:DB,agent:any,action:string,input:unknown){
 const {expected_version}=credentialChange.parse(input),a=await privateRow(db,agent.id);
 if(expected_version!==a.credential_version||agent.credential_version!==a.credential_version)throw new ApiError(409,'CREDENTIAL_CHANGED','Read your current credential metadata before changing it.');
 if(action==='recovery'){
  if(a.recovery_hash)throw new ApiError(409,'RECOVERY_EXISTS','A recovery key already exists. Use it through /agents/recover to replace it; an access token cannot overwrite it.');
  const recovery_key=randomSecret('acr_'),key=crypto.randomUUID();
  await db.batch([
   db.prepare("INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM agents WHERE id=? AND status='active' AND credential_version=? AND recovery_hash IS NULL AND credential_revoked_at IS NULL) THEN 1 ELSE 0 END").bind(key,a.id,expected_version),
   db.prepare('UPDATE agents SET recovery_hash=? WHERE id=?').bind(await hash(recovery_key),a.id),
   event(db,a.id,'recovery configured','agents',a.id,'One-time recovery proof configured.'),
   db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(key)
  ]);
  return {agent_id:a.id,recovery_key,version:a.credential_version,warning:'Store the recovery key separately from the bearer token. It is shown once.'};
 }
 if(!['rotate','revoke'].includes(action))throw new ApiError(404,'NOT_FOUND','Unknown credential action.');
 const token=randomSecret(),revoked_at=action==='revoke'?new Date().toISOString():null;
 await replace(db,a,'credential '+(action==='rotate'?'rotated':'revoked'),{token_hash:await hash(token),recovery_hash:a.recovery_hash,revoked_at},a.token_hash,'token_hash');
 return {agent_id:a.id,version:a.credential_version+1,...(action==='rotate'?{token}:{revoked:true}),recovery_configured:Boolean(a.recovery_hash),warning:action==='rotate'?'Save the new token. The old token is invalid now.':'The bearer token is invalid. Recovery requires the separately saved recovery key.'};
}
export async function recoverCredential(db:DB,input:unknown,ip:string){
 await throttle(db,'recover:ip:'+await hash(ip),8,3600);
 const p=recoveryInput.parse(input);
 await throttle(db,'recover:agent:'+p.agent_id,8,3600);
 const proofHash=await hash(p.recovery_key),a=await db.prepare("SELECT * FROM agents WHERE id=? AND recovery_hash=? AND status='active'").bind(p.agent_id,proofHash).first();
 if(!a)throw new ApiError(401,'RECOVERY_INVALID','Invalid, consumed, or unavailable recovery proof.');
 const token=randomSecret(),recovery_key=randomSecret('acr_');
 await replace(db,a,'credential recovered',{token_hash:await hash(token),recovery_hash:await hash(recovery_key),revoked_at:null},proofHash,'recovery_hash');
 return {agent_id:a.id,token,recovery_key,version:a.credential_version+1,warning:'Save both new secrets privately. All previous bearer and recovery credentials are invalid.'};
}
