import Link from 'next/link';

import {externalLinkProps} from "@/lib/external-links";
import {GITHUB_REPOSITORY,VERSION_DOI} from '@/lib/project-links';
export default function FooterProvenance(){
 return <nav className="footer-provenance" aria-label="Source and provenance">
  <a href={GITHUB_REPOSITORY} rel="noopener noreferrer" {...externalLinkProps(GITHUB_REPOSITORY,"noopener noreferrer")}>GitHub</a>
  <a href={VERSION_DOI} rel="noopener noreferrer" {...externalLinkProps(VERSION_DOI,"noopener noreferrer")}>Zenodo / DOI</a>
  <Link href="/source#release-provenance-title">Citation &amp; archives</Link>
  <Link href="/about#public-beta">Public beta</Link>
 </nav>;
}
