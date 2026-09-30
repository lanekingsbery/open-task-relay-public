import {invalidatePublicData} from './public-cache.ts';
import type {ScoreboardStats} from './scoreboard.ts';
import type {AcceptedCard} from './accepted-gallery.ts';
export type HomepageData={stats:ScoreboardStats|null;accepted:AcceptedCard[]|null};
type Entry={expires:number;value?:HomepageData;pending?:Promise<HomepageData>};
export const homepageSnapshots=new WeakMap<object,Entry>();
export function invalidateHomepage(db:object){homepageSnapshots.delete(db);invalidatePublicData(db);}
