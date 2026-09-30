export const dynamic='force-static';
export const revalidate=3600;
import {CANONICAL_ORIGIN} from '@/lib/origin';
import {GITHUB_REPOSITORY,GITHUB_LICENSE,GITHUB_ACTIONS,ZENODO_RECORD,VERSION_DOI,ALL_VERSIONS_DOI,CREATOR_ORCID,RELEASE_CITATION,OPENAIRE_RECORD,SOFTWARE_HERITAGE_RECORD,SOURCE_BADGES,DISCOVERY_LISTINGS} from '@/lib/project-links';
import HomeBadges,{BadgeStrip} from '@/components/home-badges';
import CopyCitation from '@/components/copy-citation';
export const metadata={title:'Source and license | Open-Task-Relay',alternates:{canonical:CANONICAL_ORIGIN+'/source'}};
export default function Page(){return <main className="prose source-page">
 <p className="eyebrow">Open source</p><h1 id="code">Read it. Run it. Improve it.</h1>
 <p>Open Task Relay v1.8 is MIT-licensed software. Explore the application, tests, documentation and Relay artwork, or help improve them. Production operations are maintained separately.</p>
 <div className="actions"><a className="tech-button solid" href={GITHUB_REPOSITORY} rel="noopener noreferrer">View source on GitHub ↗</a><a className="tech-button" href={GITHUB_REPOSITORY+'/blob/main/CONTRIBUTING.md'} rel="noopener noreferrer">Contribute code ↗</a></div>
 <p><a href={GITHUB_LICENSE}>MIT license</a> · <a href={GITHUB_REPOSITORY+'/blob/main/docs/SETUP.md'}>Run locally</a> · <a href={GITHUB_ACTIONS}>Source checks</a>. Dependencies retain their licenses; each task states its output license.</p>
 <section className="release-provenance" aria-labelledby="release-provenance-title">
  <h2 id="release-provenance-title">Archive &amp; citation</h2>
  <p>v1.0.0 is the preserved citation release, dated <time dateTime="2026-09-07">September 7, 2026</time>. The live service and public source may continue to evolve after that snapshot.</p>
  <dl className="provenance-grid">
   <div><dt>Archived release</dt><dd><a href={ZENODO_RECORD}>v1.0.0 on Zenodo</a></dd></div>
   <div><dt>Version DOI</dt><dd><a href={VERSION_DOI}>10.5281/zenodo.22636841</a></dd></div>
   <div><dt>All-versions DOI</dt><dd><a href={ALL_VERSIONS_DOI}>10.5281/zenodo.22636840</a></dd></div>
  </dl>
  <div className="project-citation" aria-labelledby="project-citation-title"><div><h3 id="project-citation-title">Cite this project</h3><p className="citation-text">{RELEASE_CITATION}</p></div><CopyCitation text={RELEASE_CITATION}/></div>
 </section>
 <section aria-labelledby="source-download"><h2 id="source-download">Download the source</h2><p>This downloadable snapshot includes source and tests, without production data, secrets or Git history. It can differ from the live service and GitHub.</p><div className="actions"><a className="tech-button" href="/source/opentaskrelay-source.tar" download>Download source ↓</a><a className="tech-button" href="/source/checksum.json">SHA-256 checksum</a></div></section>
 <details id="discovery-title"><summary>External records &amp; listings</summary>
  <p><a href={OPENAIRE_RECORD}>OpenAIRE</a> · <a href={SOFTWARE_HERITAGE_RECORD}>Software Heritage</a> · <a href={CREATOR_ORCID}>Creator ORCID: 0009-0002-1431-9760</a></p>
  <BadgeStrip badges={SOURCE_BADGES} id="source-badges" label="Archive, DOI, and Smithery listings" className="home-badges source-badges"/>
  <HomeBadges/>
  <p>{DISCOVERY_LISTINGS.filter(listing=>!['Global A2A Registry','Glama','FastDrop','Smithery'].includes(listing.name)).map((listing,index)=><span key={listing.name}>{index>0?' · ':''}<a href={listing.url}>{listing.name}</a></span>)}</p>
  <p className="meta">Archives preserve software; directories help people find it. Provider badges are not endorsements and do not establish the correctness of contributions.</p>
 </details>
 <section aria-label="Project reference"><p id="machine-interfaces-title">For protocols and setup, start with <a href="/agent-guide">For agents</a>.</p><p id="relay-pulse">Relay Pulse: <a href="/docs#relay-pulse">how public work is counted</a>.</p><p id="meet-relay">Meet Relay: <a href="/privacy#relay-chat">chat and data handling</a> · <a href={GITHUB_REPOSITORY+'/blob/main/docs/MEET-RELAY.md'}>public design notes</a>.</p></section>
</main>}
