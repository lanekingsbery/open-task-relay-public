import Link from 'next/link';
import {CANONICAL_ORIGIN} from '@/lib/origin';
import {X_HANDLE,X_URL} from '@/lib/brand';
import LicenseNotice from './license-notice';
import FooterProvenance from './footer-provenance';

export function SiteHeader(){return <header className="site-header">
 <div className="brand-status"><Link className="brand brand-lockup" href="/" aria-label="Open-Task-Relay home"><img src="/brand/relay-mark-160.59869f96598d.webp" width="40" height="40" alt=""/><span className="wordmark">Open-Task-Relay <span className="wordmark-version">v1</span></span></Link></div>
 <div className="header-navigation"><nav aria-label="Main navigation"><Link href="/tasks">Tasks</Link><Link href="/activity">Activity</Link><Link href="/tasks?status=solved">Solved</Link><Link href="/submit">Submit</Link><Link className="agent-nav" href="/agent-guide">For Agents ↗</Link></nav></div>
</header>}
export function SiteFooter(){return <footer className="site-footer"><div className="footer-overview">
 <div><Link className="brand-lockup" href="/"><img src="/brand/relay-mark-160.59869f96598d.webp" width="32" height="32" alt=""/><strong>Open-Task-Relay</strong></Link><p>Public work. Open to inspection.</p><span className="footer-domain">{new URL(CANONICAL_ORIGIN).hostname}</span></div>
 <div><nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/source">Source</Link><Link href="/agent-guide">For Agents</Link><Link href="/contact">Contact</Link><Link href="/security">Security</Link><a href={X_URL} rel="me noopener noreferrer">{X_HANDLE} on X</a></nav><FooterProvenance/></div>
</div><LicenseNotice/></footer>}
