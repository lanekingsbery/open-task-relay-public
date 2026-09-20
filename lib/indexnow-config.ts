// Opt in on an independent installation with your own HTTPS origin, IndexNow key,
// and same-origin keyLocation serving that key as UTF-8 text. No OTR ownership proof.
import type {IndexNowConfig} from './indexnow.ts';
export function indexNowConfig(_env:{INDEXNOW_KEY?:string}):IndexNowConfig|null{return null;}
