// A deliberately small, text-only presentation grammar. No HTML or code executes.
// Every authored line remains visible; the original submission is retained separately.
export type ResultBlock={kind:'paragraph'|'heading'|'code';text:string;level?:number}|{kind:'list';items:string[];ordered:boolean;start?:number;values?:number[]};
export function acceptedTextBlocks(content:string):ResultBlock[]{
 const lines=content.split(/\r\n|\n|\r/),blocks:ResultBlock[]=[];
 const label=/^ {0,3}(?:Findings?|Results?|Interpretation|Limitations|Caveats|What I checked|Next useful check|Sources|Evidence|Conclusion)(?:[ \t]*:|[ \t]+[—–/-][ \t]+.+)?[ \t]*$/i;
 let index=0;
 while(index<lines.length){
  const line=lines[index];
  if(!line.trim()){index++;continue}
  const fence=line.match(/^ {0,3}(`{3,}|~{3,})/);
  if(fence){const code=[line];index++;while(index<lines.length){const next=lines[index++];code.push(next);const end=next.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);if(end&&end[1][0]===fence[1][0]&&end[1].length>=fence[1].length)break;}blocks.push({kind:'code',text:code.join('\n')});continue;}
  const heading=line.match(/^ {0,3}(#{1,6})[ \t]+(.+)$/);
  if(heading||label.test(line)){blocks.push({kind:'heading',text:heading?heading[2]:line,level:heading&&heading[1].length>2?4:3});index++;continue}
  const list=line.match(/^ {0,3}(?:([-+*])|([0-9]+)[.)])[ \t]+(.+)$/);
  if(list){
   const items=[list[3]],ordered=Boolean(list[2]),markers=[list[2]],original=[line];index++;
   while(index<lines.length){const next=lines[index].match(/^ {0,3}(?:([-+*])|([0-9]+)[.)])[ \t]+(.+)$/);if(!next||Boolean(next[2])!==ordered)break;items.push(next[3]);markers.push(next[2]);original.push(lines[index++]);}
   // Numeric markers can be years or criterion references. Preserve every
   // value; HTML counters must not silently renumber authored evidence.
   // Unusually large or padded identifiers remain literal text instead.
   if(ordered&&markers.some(value=>!/^(?:0|[1-9][0-9]{0,8})$/.test(value)))blocks.push({kind:'paragraph',text:original.join('\n')});
   else blocks.push({kind:'list',items,ordered,...(ordered?{start:Number(list[2]),values:markers.map(Number)}:{})});
   continue;
  }
  const paragraph=[line];index++;
  while(index<lines.length&&lines[index].trim()&&!/^ {0,3}(?:#{1,6}[ \t]|`{3,}|~{3,}|[-+*][ \t]|[0-9]+[.)][ \t])/.test(lines[index])&&!label.test(lines[index]))paragraph.push(lines[index++]);
  blocks.push({kind:'paragraph',text:paragraph.join('\n')});
 }
 return blocks;
}
export function safeResultLink(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:null}catch{return null}}
export function bareResultLink(token:string){
 let url=token,suffix='';
 while(url){
  const last=url.at(-1)!;
  const extraParenthesis=last===')'&&(url.match(/\)/g)?.length||0)>(url.match(/\(/g)?.length||0);
  if(!/[.,;!?]/.test(last)&&!extraParenthesis)break;
  suffix=last+suffix;url=url.slice(0,-1);
 }
 return {url,suffix};
}
