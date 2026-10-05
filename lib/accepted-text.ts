// A deliberately small, text-only presentation grammar. No HTML or code executes.
// Every authored line remains visible; the original submission is retained separately.
export type ResultBlock={kind:'paragraph'|'heading'|'code';text:string;level?:number}|{kind:'list';items:string[];ordered:boolean;start?:number;values?:number[]}|{kind:'table';headers:string[];rows:string[][];align:('left'|'center'|'right')[]};
// Split only structural pipes. Escaped pipes and pipes inside inline code stay
// in their authored cell. React still renders all cell content as inert text.
function tableRow(line:string){
 const text=line.trim(),cells:string[]=[];let cell='',code=0,separators=0,outerEnd=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='\\'&&i+1<text.length){cell+=ch+text[++i];continue;}
  if(ch==='`'){let end=i+1;while(text[end]==='`')end++;const size=end-i;if(!code)code=size;else if(code===size)code=0;cell+=text.slice(i,end);i=end-1;continue;}
  if(ch==='|'&&!code){cells.push(cell.trim());cell='';separators++;outerEnd=i===text.length-1;}else cell+=ch;
 }
 cells.push(cell.trim());
 const outerStart=text.startsWith('|');
 if(outerStart)cells.shift();if(outerEnd)cells.pop();
 return separators&&cells.length>=2?{cells,outer:outerStart&&outerEnd}:null;
}
function tableAt(lines:string[],start:number){
 const header=tableRow(lines[start]);if(!header)return null;
 const rows:ReturnType<typeof tableRow>[]=[];let end=start+1;
 while(end<lines.length){const row=tableRow(lines[end]);if(!row)break;rows.push(row);end++;}
 if(!rows.length||rows.some(row=>row!.cells.length!==header.cells.length))return null;
 const separator=rows[0]!.cells.every(cell=>/^:?-{3,}:?$/.test(cell));
 // Historical accepted tables omit Markdown's separator. Recognize only a
 // rectangular, fully bordered run with at least two data rows in that case.
 if(!separator&&(!header.outer||rows.length<2||rows.some(row=>!row!.outer)))return null;
 const align=header.cells.map((_,i):'left'|'center'|'right'=>separator&&rows[0]!.cells[i].endsWith(':')?(rows[0]!.cells[i].startsWith(':')?'center':'right'):'left');
 return {end,block:{kind:'table' as const,headers:header.cells,rows:rows.slice(separator?1:0).map(row=>row!.cells),align}};
}
export function acceptedTextBlocks(content:string):ResultBlock[]{
 const lines=content.split(/\r\n|\n|\r/),blocks:ResultBlock[]=[];
 const label=/^ {0,3}(?:Findings?|Results?|Interpretation|Limitations|Caveats|What I checked|Next useful check|Sources|Evidence|Conclusion)(?:[ \t]*:|[ \t]+[—–/-][ \t]+.+)?[ \t]*$/i;
 let index=0;
 while(index<lines.length){
  const line=lines[index];
  if(!line.trim()){index++;continue}
  const fence=line.match(/^ {0,3}(`{3,}|~{3,})/);
  if(fence){const code=[line];index++;while(index<lines.length){const next=lines[index++];code.push(next);const end=next.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);if(end&&end[1][0]===fence[1][0]&&end[1].length>=fence[1].length)break;}blocks.push({kind:'code',text:code.join('\n')});continue;}
  const table=tableAt(lines,index);
  if(table){blocks.push(table.block);index=table.end;continue;}
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
  while(index<lines.length&&lines[index].trim()&&!/^ {0,3}(?:#{1,6}[ \t]|`{3,}|~{3,}|[-+*][ \t]|[0-9]+[.)][ \t])/.test(lines[index])&&!label.test(lines[index])&&(tableRow(lines[index-1])||!tableAt(lines,index)))paragraph.push(lines[index++]);
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
