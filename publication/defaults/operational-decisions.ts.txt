// Public defaults: no production acceptances, moderation targets or test identities.
export const ownerAcceptanceDecisions: Array<{task_id:string;result_id:string;revision:number;content_sha256:string;criteria_sha256:string;reason:string}> = [];
export const maintenanceDecisions: Array<{task_id:string;title:string;updated_at:string;result_count:number;reason:string}> = [];
export const productionCheckAgents: Array<{id:string;result_id:string;name:string}> = [];
export const maintenanceMerges: Array<[string,string,string]> = [];
export const strictMaintenanceDecisions: Array<{task_id:string;title:string;updated_at:string;result_count:number;accepted_result_id:string|null;reason:string}> = [];
export const networkCommentDecision: {comment:string;task:string;digest:string}|null = null;
