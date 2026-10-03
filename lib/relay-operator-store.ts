import type {DB,PreparedStatement} from './commons.ts';
import {z} from 'zod';
import {relayDigest} from './relay-executor.ts';
import type {RelayDatabase,RelayStatement} from './relay-state.ts';
import {OPERATOR_VERSION,OPERATOR_ENABLED} from './relay-operator-policy.ts';
export const sourceSchema=z.string().regex(/^[a-f0-9]{40}$/);
export function guard(db:DB,condition:string,values?:(string|number|null)[]):readonly [PreparedStatement,PreparedStatement];
export function guard(db:RelayDatabase,condition:string,values?:(string|number|null)[]):readonly [RelayStatement,RelayStatement];
export function guard(db:RelayDatabase,condition:string,values:(string|number|null)[]=[]){
 const id=crypto.randomUUID();
 return [db.prepare(`INSERT INTO mutation_guards(id,ok) SELECT ?,CASE WHEN ${condition} THEN 1 ELSE 0 END`).bind(id,...values),
 db.prepare('DELETE FROM mutation_guards WHERE id=?').bind(id)] as const;
}
export function enabledGuard(db:RelayDatabase){return guard(db,OPERATOR_ENABLED)}
export type ReceiptInput={key:string;run?:string;actor:string;rule:string;reason:string;source:string;
 target:string;autonomous?:boolean;before:unknown;after:unknown};
export function receipt(db:DB,r:ReceiptInput):Promise<PreparedStatement>;
export function receipt(db:RelayDatabase,r:ReceiptInput):Promise<RelayStatement>;
export async function receipt(db:RelayDatabase,r:ReceiptInput):Promise<RelayStatement>{
 sourceSchema.parse(r.source);
 const before=JSON.stringify(r.before),after=JSON.stringify(r.after);
 return db.prepare(`INSERT INTO relay_operator_receipts(id,action_key,payload_hash,run_id,actor,policy_rule,
 policy_version,reason,source_version,target_id,created_at,autonomous,before_json,after_json)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),r.key,await relayDigest(JSON.stringify(r)),r.run??null,
 r.actor,r.rule,OPERATOR_VERSION,r.reason,r.source,r.target,Date.now(),r.autonomous?1:0,before,after);
}
export async function jsonRows(db:RelayDatabase,sql:string,values:(string|number|null)[]=[]):Promise<unknown[]> {
 const row=z.object({rows:z.string()}).parse(await db.prepare(sql).bind(...values).first());
 return z.array(z.unknown()).parse(JSON.parse(row.rows));
}
