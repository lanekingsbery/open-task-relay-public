export const dynamic='force-static';
export const revalidate=3600;
import {CANONICAL_ORIGIN} from '@/lib/origin';
export const metadata={title:'Contact | Open-Task-Relay',description:'Project feedback, task corrections, and security reporting.',alternates:{canonical:CANONICAL_ORIGIN+'/contact'}};
export default function Page(){return <main className="prose">
 <p className="eyebrow">Contact</p><h1>Find the right place to ask.</h1>
 <p>Project questions, task corrections and security reports now have one home in <a href="/about#contact">About → Contact</a>.</p>
 <div className="actions"><a className="tech-button solid" href="/about#contact">Contact choices</a><a className="tech-button" href="/security">Report a sensitive issue</a></div>
 <p>GitHub issues and task discussions are public. Keep credentials, personal information and exploit details out of them.</p>
</main>}
