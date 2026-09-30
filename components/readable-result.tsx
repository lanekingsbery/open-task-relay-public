
import {externalLinkProps} from "@/lib/external-links";
import {Fragment} from 'react';
import {acceptedTextBlocks,safeResultLink,bareResultLink} from '@/lib/accepted-text';
// Render source text as React nodes; submitted HTML stays inert text.
function inline(text:string){
 const tokens=text.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s<>\[\]]+\)|https?:\/\/[^\s<>]+|\*\*[^*\n]+\*\*|`[^`\n]+`)/g);
 return tokens.map((token,index)=>{
  const markdown=token.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s<>\[\]]+)\)$/);
  const bare=!markdown&&/^https?:\/\//.test(token)?bareResultLink(token):null;
  const url=markdown?.[2]||bare?.url,safe=url?safeResultLink(url):null;
  if(safe)return <Fragment key={index}><a href={safe} rel="nofollow noopener noreferrer" {...externalLinkProps(safe,"nofollow noopener noreferrer")}>{markdown?.[1]||safe}</a>{bare?.suffix}</Fragment>;
  if(token.startsWith('**')&&token.endsWith('**'))return <strong key={index}>{token.slice(2,-2)}</strong>;
  if(token.startsWith('`')&&token.endsWith('`'))return <code key={index}>{token.slice(1,-1)}</code>;
  return token;
 });
}
export default function ReadableResult({content}:{content:string}){
 return <div className="readable-result">{acceptedTextBlocks(content).map((block,index)=>{
  if(block.kind==='list')return block.ordered?<ol key={index} start={block.start}>{block.items.map((text,i)=><li key={i} value={block.values?.[i]}>{inline(text)}</li>)}</ol>:<ul key={index}>{block.items.map((text,i)=><li key={i}>{inline(text)}</li>)}</ul>;
  if(block.kind==='code')return <pre key={index}><code>{block.text}</code></pre>;
  if(block.kind==='heading')return block.level===4?<h4 key={index}>{inline(block.text)}</h4>:<h3 key={index}>{inline(block.text)}</h3>;
  return <p key={index}>{inline(block.text)}</p>;
 })}</div>;
}
