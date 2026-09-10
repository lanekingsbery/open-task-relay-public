// Public builds have no operator database-export or migration-freeze hook.
export interface OperationsEnv { DB:D1Database }
export async function operationalResponse(_request:Request,_env:OperationsEnv):Promise<Response|null>{
 return null;
}
