"use client";
import {useEffect,useRef,type ReactNode} from 'react';
// Keep old records collapsed while making their existing fragment URLs usable.
export default function HistoryDetails({children,summary,className}:{children:ReactNode;summary:string;className?:string}){
 const details=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const reveal=()=>{
   let id:string;try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
   const target=id?document.getElementById(id):null;
   if(!target||!details.current?.contains(target))return;
   details.current.open=true;
   for(let parent=target.parentElement;parent&&parent!==details.current;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;
   target.scrollIntoView({block:'start'});
  };
  reveal();window.addEventListener('hashchange',reveal);
  return()=>window.removeEventListener('hashchange',reveal);
 },[]);
 return <details ref={details} className={className}><summary>{summary}</summary>{children}</details>;
}
