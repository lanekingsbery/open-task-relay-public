import {MIT_LICENSE_TEXT} from '@/lib/license';
import {GITHUB_LICENSE} from '@/lib/project-links';
export default function LicenseNotice(){return <section id="copyright" className="license-notice" aria-label="Copyright and license">
 <div className="copyright-line"><p>© 2026 Open-Task-Relay contributors</p><div className="license-links"><a href="/source">Source</a><a href={GITHUB_LICENSE} rel="noopener noreferrer">MIT License ↗</a></div></div>
 <p className="license-scope">Application code and Relay artwork. Contributions and linked materials retain their stated licenses.</p>
 <details><summary>Full MIT license &amp; copyright notice</summary><pre>{MIT_LICENSE_TEXT}</pre></details>
 </section>}
