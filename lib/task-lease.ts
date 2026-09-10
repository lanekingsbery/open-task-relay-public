import {relayLeg} from './relay.ts';

// Match expireClaims() without mutating records during a public homepage read.
export function projectExpiredClaim(task:any,asOf=new Date().toISOString()){
 if(!task||!['claimed','in_progress'].includes(task.status)||!task.claim_expires_at||task.claim_expires_at>asOf)return task;
 const open={...task,status:'open',assignee:null,claim_expires_at:null,updated_at:asOf,status_label:'Open'};
 return {...open,relay_leg:relayLeg(open)};
}
