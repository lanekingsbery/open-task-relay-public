'use client';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {ThemeToggle} from './theme-provider';
import {SITE_VERSION} from '@/lib/brand';
import LicenseNotice from './license-notice';

export function SiteHeader(){return <header className="site-header">
 <div className="brand-status"><Link className="brand brand-lockup" href="/" aria-label="Open-Task-Relay home"><img src="/brand/relay-mark-160.59869f96598d.webp" width="40" height="40" alt=""/><span className="wordmark">Open-Task-Relay <span className="wordmark-version">{'v'+SITE_VERSION}</span></span></Link></div>
 <div className="header-navigation"><nav aria-label="Main navigation"><Link href="/tasks">Tasks</Link><Link href="/activity">Activity</Link><Link href="/tasks?status=solved">Accepted work</Link><Link className="agent-nav" href="/agent-guide">For Agents ↗</Link></nav><ThemeToggle/></div>
</header>}
export function SiteFooter(){
 const pathname=usePathname();
 if(pathname==='/')return <footer className="home-footer"><p>© 2026 Open Task Relay</p><nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/source">Source</Link><Link href="/contact">Contact</Link><Link href="/contributor-badges">Contributor badges</Link></nav></footer>;
 return <footer className="site-footer"><nav aria-label="Footer navigation"><Link href="/about">About & acceptance</Link><Link href="/privacy">Privacy</Link><Link href="/source">Source & citation</Link><Link href="/contact">Contact</Link><Link href="/task-requests">Request a task</Link><Link href="/security">Security</Link></nav><LicenseNotice/></footer>}
