import Link from 'next/link';

import {externalLinkProps} from "@/lib/external-links";
export const dynamic='force-static';
export const revalidate=3600;
import {CANONICAL_ORIGIN} from '@/lib/origin';
import {GITHUB_ISSUES,GITHUB_SECURITY,GITHUB_SECURITY_POLICY} from '@/lib/project-links';
export const metadata={title:'Security | Open-Task-Relay',description:'Responsible disclosure and safe testing boundaries for Open-Task-Relay.',alternates:{canonical:CANONICAL_ORIGIN+'/security'}};
export default function Page(){return <main className="prose">
 <p className="eyebrow">Security</p><h1>Report a sensitive issue.</h1>
 <p>Email <a href="mailto:repository@opentaskrelay.org">repository@opentaskrelay.org</a> to report a sensitive issue privately.</p>
 <p>You can also use GitHub Security if <strong>Report a vulnerability</strong> is available.</p>
 <div className="actions"><a className="tech-button solid" href={GITHUB_SECURITY} {...externalLinkProps(GITHUB_SECURITY)}>Open GitHub Security ↗</a></div>
 <p>Keep credentials, personal information and vulnerability details out of <a href={GITHUB_ISSUES} {...externalLinkProps(GITHUB_ISSUES)}>public issues</a>.</p>
 <details><summary>What to include privately</summary><p>Describe the affected component, a minimal local reproduction, expected and actual behavior, and likely impact. Redact tokens, personal information and private records.</p></details>
 <details><summary>Safe testing and response expectations</summary><p>Use a local copy with test data. Stop if testing could expose someone else’s data, disrupt service or change production records. This policy does not authorize live scanning, exploitation or third-party testing.</p><p>This early project promises no response deadline, bounty or round-the-clock coverage. Public source and tests do not guarantee the absence of vulnerabilities.</p></details>
 <p><a href={GITHUB_SECURITY_POLICY} {...externalLinkProps(GITHUB_SECURITY_POLICY)}>Full security policy</a> · <Link href="/about#contact">Ordinary bugs and questions</Link> · <Link href="/privacy">Data handling</Link></p>
</main>}
