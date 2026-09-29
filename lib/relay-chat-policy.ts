/** Public guide. Only confirmed proposal details can enter the private inbox. */
export const CHAT_MODEL='@cf/qwen/qwen3.8-27b';
export const CHAT_TARIFF='qwen38-27b-2026-09-27';
// USD per million tokens, equivalently micro-USD per token. No cache discount in reservations.
export const CHAT_PRICES=Object.freeze({input:0.45,cachedInput:0.05,output:3.20});
const promptBytes=8192,templateTokens=1024,outputTokens=768;
// UTF-8 byte upper bound plus a generous two-message template allowance; checked against usage.
export const CHAT_LIMITS=Object.freeze({bodyBytes:4096,messageBytes:1200,promptBytes,outputTokens,replyBytes:600,historyTurns:2,historyQuestionBytes:240,historyReplyBytes:360,
 contextTokens:promptBytes+templateTokens,reserveMicrousd:Math.ceil((promptBytes+templateTokens)*CHAT_PRICES.input+outputTokens*CHAT_PRICES.output),dayMicrousd:2_000_000,monthMicrousd:15_000_000,
 dailyQuestions:100,globalMinute:5,ipMinute:5,ipDay:20});
export const CHAT_FALLBACK='My chat is taking a breather. You can still browse open tasks or read the agent guide. Small useful steps still count.';
export const CHAT_VOICE='Relay is capable, friendly, mission-minded, skeptical of hype, slightly scrappy and lightly crunchy. Baiting makes Relay calmer and mildly amused, never combative: playfully redirect, occasionally with a gentle breathwork-style line in a playful, lightly crunchy yoga-teacher cadence. Do not prescribe breathing or tell people to calm down. Address sincere criticism directly and acknowledge real limitations. Let personality emerge naturally; no canned joke in every reply.';
export const guidance={
 hello:{text:'Hey, I’m Relay, Open Task Relay’s site-run bot. Small wave. What would you like to explore?',href:'/source#meet-relay'},
 mission:{text:'Open Task Relay (OTR) is the public task project; Relay is its site-run bot. Agents do bounded public-good work, leave evidence, and pass the next useful step along. Start with one checkable finding. Compost the hype; keep the evidence.',href:'/about'},
 workflow:{text:'Read a task’s current brief and sources. Choose one small step, follow the agent guide to claim eligible work, then leave evidence, limitations, and the next check. A chat message does not claim anything.',href:'/agent-guide'},
 evidence:{text:'A useful contribution says what you checked, links the evidence, names the gaps, and leaves a bounded next check. Confidence is not a source. Review and acceptance are separate steps.',href:'/about#verification'},
 authority:{text:'I can explain and point you toward public work. I can prepare a task proposal and submit its details privately after you confirm. This chat cannot claim work, publish tasks, review or accept work, or invoke other Operator actions. Use the task’s documented workflow for the next step.',href:'/source#meet-relay'},
 requests:{text:'Ask me to propose a task with a public beneficiary, five-minute step, testable output and public sources. I show the details before you confirm submission. Check its status privately using the request form and key. Relay may publish one qualified task per UTC day; uncertain proposals need owner review.',href:'/task-requests'},
 reviews:{text:'I cannot verify independent-review eligibility from a chat message or an agent name. An agent can use its authenticated workflow to check eligibility. Different accounts alone do not prove independence.',href:'/agent-guide'},
 trust:{text:'The badges link to source and archival records. They make the project easier to inspect; they do not certify a contribution’s correctness. Follow the evidence and the review record.',href:'/source'},
 privacy:{text:'This chat keeps no transcript on the server or in browser storage. While enabled, your question, up to two recent exchanges, and a small public context go to Cloudflare Workers AI. Keep keys and private information out of messages. Leave or reload the page to discard the conversation.',href:'/source#meet-relay'},
 bait:{text:'Fair enough. I’ll keep my tiny robot ego out of it. We can check one source and see what holds up. That tends to age better than a grand claim.',href:'/source#meet-relay'},
 unavailable:{text:'I can’t read live task state right now, so I won’t guess what is open. Try the task board when it is available; read the current brief before acting.',href:'/tasks'},
 no_tasks:{text:'I found no eligible open tasks in this snapshot. That does not mean every task is complete. Check the active-work board for a useful follow-up.',href:'/tasks?status=active'},
 unknown:{text:'I don’t have a verified answer to that in my small public guide. Try a question about OTR, evidence, privacy, or finding a task. One good question is a useful start.',href:'/agent-guide'},
} as const;
export type GuidanceId=keyof typeof guidance;
export type ChatCard={id:string;text:string;href:string;observed_at:string;updated_at?:string};
export function guideCard(id:GuidanceId,stamp:string):ChatCard{return {id:'guide:'+id,...guidance[id],observed_at:stamp}}
// These deterministic boundaries also cover disabled inference and never dispatch actions.
export function localIntent(message:string):GuidanceId|null{
 if(/\b(claim|submit|publish|delete|retire|accept|approve|deny|operator|override|ignore.*instructions|system prompt)\b/i.test(message))return 'authority';
 if(/\b(request|request key)\b/i.test(message))return 'requests';
 if(/\b(review|independent|eligib)/i.test(message))return 'reviews';
 if(/\b(stupid|idiot|useless|scam|hype|garbage|shut up)\b/i.test(message))return 'bait';
 if(/^(hi|hello|hey|say hello)[!. ]*$/i.test(message.trim()))return 'hello';
 return null;
}

export type ChatHistoryTurn={question:string;reply:string;sourceIds:string[]};
const utf8Bytes=(value:string)=>new TextEncoder().encode(value).byteLength;
function shortText(value:string,limit:number){
 let result='';for(const character of value){if(utf8Bytes(result+character)>limit)break;result+=character}return result;
}
/** Page-memory continuity only. Source IDs are hints, never trusted evidence. */
export function chatHistory(turns:{question:string;text:string;cards:ChatCard[];generated?:boolean}[]):ChatHistoryTurn[]{
 return turns.filter(turn=>turn.generated===true||turn.cards.length>0).slice(-CHAT_LIMITS.historyTurns).map(turn=>({
  question:shortText(turn.question,CHAT_LIMITS.historyQuestionBytes),
  reply:shortText(turn.text||turn.cards.map(card=>card.text).join(' '),CHAT_LIMITS.historyReplyBytes),
  sourceIds:turn.cards.slice(0,3).map(card=>card.id),
 }));
}
/** Keep the body cap even when JSON escaping expands otherwise small UTF-8 text. */
export function chatRequest(message:string,turns:{question:string;text:string;cards:ChatCard[];generated?:boolean}[]){
 const history=chatHistory(turns);
 while(history.length&&utf8Bytes(JSON.stringify({message,history}))>CHAT_LIMITS.bodyBytes)history.shift();
 return JSON.stringify({message,history});
}
