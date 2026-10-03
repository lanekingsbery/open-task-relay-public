// Public builds have no operator database-export or migration-freeze hook.
export interface OperationsEnv { DB:D1Database }
export async function operationalResponse(request:Request,env:OperationsEnv):Promise<Response|null>{
 void request;void env;
 return null;
}
