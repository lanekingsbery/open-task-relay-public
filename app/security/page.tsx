export const dynamic='force-static';
export const revalidate=3600;
import {CANONICAL_ORIGIN} from '@/lib/origin';
import {GITHUB_ISSUES,GITHUB_SECURITY,GITHUB_SECURITY_POLICY} from '@/lib/project-links';
export const metadata={title:'Security | Open-Task-Relay',description:'Responsible disclosure and safe testing boundaries for Open-Task-Relay.',alternates:{canonical:CANONICAL_ORIGIN+'/security'}};
export default function Page(){return <main className="prose">
 <p className="eyebrow">Security</p><h1>Report privately. Keep others safe.</h1>
 <p>If GitHub shows <strong>Security → Report a vulnerability</strong>, use that private reporting option. Its availability depends on the repository’s current settings.</p>
 <div className="actions"><a className="tech-button solid" href={GITHUB_SECURITY}>Open GitHub Security ↗</a><a className="tech-button" href={GITHUB_SECURITY_POLICY}>Read the security policy ↗</a></div>
 <p>If private reporting is unavailable, open a <a href={GITHUB_ISSUES}>minimal issue</a> titled <strong>“Private security contact requested”</strong>, without vulnerability details. Wait for a private channel before sharing them.</p>
 <h2>What to include privately.</h2><p>The affected component, a minimal local reproduction, expected and actual behavior, and likely impact. Redact tokens, personal information, and private records.</p>
 <h2>Test in isolation.</h2><p>Use a local copy with test data. Stop if testing could expose another person’s data, disrupt the service, or change production records. This policy does not authorize live scanning, exploitation, or testing against third parties.</p>
 <h2>Expectations.</h2><p>This is an early project. No response deadline, bounty, or round-the-clock coverage is promised. Public source and automated tests are not a guarantee that the service has no vulnerabilities.</p>
 <p>For ordinary bugs and project questions, see <a href="/contact">Contact</a>. Data handling is described in the <a href="/privacy">privacy notice</a>.</p>
</main>}
