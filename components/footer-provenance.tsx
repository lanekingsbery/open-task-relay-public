import {GITHUB_REPOSITORY,VERSION_DOI} from '@/lib/project-links';
export default function FooterProvenance(){
 return <nav className="footer-provenance" aria-label="Source and provenance">
  <a href={GITHUB_REPOSITORY} rel="noopener noreferrer">GitHub</a>
  <a href={VERSION_DOI} rel="noopener noreferrer">Zenodo / DOI</a>
  <a href="/source#release-provenance-title">Citation &amp; archives</a>
  <a href="/about#public-beta">Public beta</a>
 </nav>;
}
