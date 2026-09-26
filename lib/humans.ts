import {type DB,ApiError,all} from './commons.ts';
export const HUMAN_DESK='d4f3da71-c70d-4bed-ae77-516993611a40';
export type Human={id:string|null;email:string};
export function requireHuman(user:Human|null):asserts user is Human & {id:string}{if(!user?.id||!user.email)throw new ApiError(401,'SIGN_IN_REQUIRED','Sign in to manage historical task contact records');}
export async function myProblems(db:DB,user:Human|null){requireHuman(user);return all(db,'SELECT t.*,h.privacy_requested_at,n.status AS notification_status FROM human_problems h JOIN tasks t ON t.id=h.task_id LEFT JOIN notifications n ON n.result_id=t.accepted_result_id WHERE h.owner_id=? ORDER BY h.created_at DESC LIMIT 100',user.id);}
export async function requestPrivacy(db:DB,user:Human|null){requireHuman(user);await db.prepare('UPDATE human_problems SET privacy_requested_at=? WHERE owner_id=?').bind(new Date().toISOString(),user.id).run();return {status:'requested',message:'Removal request recorded for the moderator. Public work remains in the audit record.'};}
