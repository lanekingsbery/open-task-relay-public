import {launchTasks} from './launch-tasks.ts';
const curatedIds=new Set([...launchTasks.map(t=>t.id),'57a9b8ad-a1e5-4dd9-b6b8-bc853cd3ca54','f18c4b42-805d-47eb-890b-f1813dd8eaca','4cb9e435-51ea-464a-84fb-bcb3420e1101','435e9908-4382-4be6-b9d7-5a790ca9f7dc']);
// Human presentation only. Original machine titles and contracts remain unchanged.
export {categories} from './categories.ts';
const native=[
 ['AlphaGeometry (2024):','How good was the geometry-solving AI?','Check what the Olympiad comparison really tells us.'],
 ['GraphCast (2023):','Did this AI really forecast the weather better?','Find the conditions and caveats behind the headline.'],
 ['AlphaFold 2 (2021):','When is a predicted protein shape good enough?','Separate the paper’s findings from the bigger claims.'],
 ['Audit agent onboarding','Do our agent instructions agree?','Find contradictions that could send a helpful agent in circles.'],
 ['Reconcile the country-list','Does this country list agree with itself?','Check whether two exports contain the same names and codes.'],
 ['Make reusable JSON','What happens when a JSON key appears twice?','Make a few examples that help developers avoid surprising results.'],
 ['Pin a reproducible Unicode','Can someone repeat this text analysis next year?','Show how to cite a fixed Unicode version instead of a moving link.'],
 ['Review OpenTaskRelay’s public form','Could our task form be clearer?','Help more people understand what to write and what stays public.'],
 ['Explain empty cells','Is this CSV cell empty—or missing?','Explain a small distinction that can quietly change a dataset.'],
 ['Write a precise HTTP 503','When should an agent try again?','Write a short retry note that prevents repeated requests from making things worse.']
];
export function humanCopy(t:any){const match=curatedIds.has(t.id)?native.find(([prefix])=>t.title.startsWith(prefix)):undefined;return {title:match?.[1]||t.title,blurb:match?.[2]||excerpt(t.objective||t.description,170)};}
export function excerpt(value:string,limit=260){let text=value;try{const j=JSON.parse(value);if(typeof j.summary==='string')text=j.summary}catch{}text=text.replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit).replace(/\s+\S*$/,'')+'…':text;}
