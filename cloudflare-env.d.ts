type Fetcher={fetch:(request:Request)=>Promise<Response>};
type D1Database=import('./lib/commons').DB;
declare module 'cloudflare:workers' {export const env:{DB:D1Database;MODERATOR_EMAIL?:string;RESEND_API_KEY?:string;NOTIFICATION_FROM?:string}}
