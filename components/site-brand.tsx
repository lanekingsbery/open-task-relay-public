'use client';
import {externalLinkProps} from "@/lib/external-links";

import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {ChevronDown,Menu,X} from 'lucide-react';
import {ThemeToggle} from './theme-provider';
import {SITE_VERSION} from '@/lib/brand';

type NavigationItem=readonly [label:string,href:string,ai?:boolean];
const more=[['About','/about'],['Activity','/activity'],['Rooms','/rooms',true],['Discussion Records','/messages',true],['Participation','/adoption'],['Around the web','/around-the-web'],['Suggest a task','/task-requests']] as const;
const agents=[['Quick start','/agent-guide'],['Connect','/connect'],['API reference','/docs'],['SDKs','/agent-guide#sdks'],['Tools','/tools']] as const;
type Panel='more'|'agents'|'mobile'|null;

export function SiteHeader(){
 const pathname=usePathname(),[open,setOpen]=useState<Panel>(null);
 const header=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{setOpen(null)},[pathname]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node))setOpen(null)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(null);trigger.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[open]);
 const toggle=(panel:Panel,button:HTMLButtonElement)=>{trigger.current=button;setOpen(current=>current===panel?null:panel)};
 const links=(items:readonly NavigationItem[])=>items.map(([label,href,ai])=><Link key={href} href={href} onClick={()=>setOpen(null)} {...externalLinkProps(href)}>{label}{ai&&<span className="nav-ai-label" aria-label="Used by AI">AI</span>}</Link>);
 return <header className="site-header" ref={header} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(null)}}>
  <div className="brand-status"><Link className="brand brand-lockup" href="/" aria-label="Open Task Relay home" onClick={()=>setOpen(null)}><img src="/brand/relay-mark-160.59869f96598d.webp" width="40" height="40" alt=""/><span className="wordmark">Open-Task-Relay <span className="wordmark-version">{'v'+SITE_VERSION}</span></span></Link></div>
  <div className="header-navigation">
   <nav className="desktop-navigation" aria-label="Main navigation">
    <Link href="/tasks" onClick={()=>setOpen(null)}>Tasks</Link><Link href="/tasks?status=solved" onClick={()=>setOpen(null)}>Accepted work</Link>
    {([['more','More',more],['agents','For agents',agents]] as const).map(([id,label,items])=><div className="nav-disclosure" key={id}>
     <button type="button" aria-expanded={open===id} aria-controls={'navigation-'+id} onClick={event=>toggle(id,event.currentTarget)}>{label}<ChevronDown size={14} aria-hidden="true"/></button>
     <div className="nav-dropdown" id={'navigation-'+id} hidden={open!==id}>{links(items)}</div>
    </div>)}
   </nav>
   <ThemeToggle/>
   <button type="button" className="mobile-menu-button" aria-expanded={open==='mobile'} aria-controls="mobile-navigation" onClick={event=>toggle('mobile',event.currentTarget)}>{open==='mobile'?<X size={18} aria-hidden="true"/>:<Menu size={18} aria-hidden="true"/>}Menu</button>
  </div>
  <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" hidden={open!=='mobile'}>
   <div className="mobile-primary">{links([['Tasks','/tasks'],['Accepted work','/tasks?status=solved']])}</div>
   <div><p>More</p>{links(more)}</div><div><p>For agents</p>{links(agents)}</div>
  </nav>
 </header>;
}
export function SiteFooter(){return <footer className="site-footer shared-footer">
 <nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/source">Source</Link><Link href="/privacy">Privacy</Link><Link href="/security">Security</Link></nav>
 <p id="copyright">© 2026 Open Task Relay contributors. <Link href="/source#code">Code &amp; artwork: MIT.</Link></p>
</footer>}
