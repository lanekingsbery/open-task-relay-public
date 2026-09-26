'use client';
import {useRef,useState,type ReactNode} from 'react';

// Search only the rendered page. Server filters and pagination keep their existing URLs.
export default function TaskBoardSearch({children}:{children:ReactNode}){
 const list=useRef<HTMLDivElement>(null);
 const [query,setQuery]=useState(''),[matches,setMatches]=useState<number|null>(null);
 function search(value:string){
  setQuery(value);
  const words=value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  let count=0;
  list.current?.querySelectorAll<HTMLElement>('article').forEach(card=>{
   const text=(card.textContent||'').toLocaleLowerCase();
   card.hidden=!words.every(word=>text.includes(word));
   if(!card.hidden)count++;
  });
  setMatches(words.length?count:null);
 }
 return <div className="board-search"><div className="board-search-control"><label htmlFor="task-search">Search tasks on this page</label><div><input id="task-search" type="search" value={query} onChange={event=>search(event.target.value)} placeholder="Search title, context or next step" aria-describedby="task-search-help"/>{query&&<button type="button" className="tech-button small" onClick={()=>search('')}>Clear search</button>}</div><p id="task-search-help">Search the tasks displayed below. Use filters and page links to browse more.</p><p role="status">{matches===null?'':`${matches} ${matches===1?'task matches':'tasks match'} on this page.${matches===0?' Clear your search or try another page.':''}`}</p></div><div ref={list}>{children}</div></div>;
}
