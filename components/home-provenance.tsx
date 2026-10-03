import Link from 'next/link';

import {externalLinkProps} from "@/lib/external-links";
import {Code2,GitBranch} from 'lucide-react';
import {GITHUB_REPOSITORY,VERSION_DOI,VERSION_DOI_NUMBER,OPENAIRE_RECORD,SOFTWARE_HERITAGE_RECORD} from '@/lib/project-links';
export default function ProjectBadges({details=false}:{details?:boolean}){
 return <ul id="project-records" className={'provenance-badges'+(details?' expanded':'')} aria-label="Project source and archives">
  <li><Link href="/source" className="provenance-badge"><Code2 size={14} aria-hidden="true"/>Open Source</Link></li>
  <li><a href={GITHUB_REPOSITORY} rel="noopener noreferrer" className="provenance-badge" {...externalLinkProps(GITHUB_REPOSITORY,"noopener noreferrer")}><GitBranch size={14} aria-hidden="true"/>GitHub</a></li>
  <li><a href={VERSION_DOI} rel="noopener noreferrer" className="provenance-badge doi-record" aria-label={'Zenodo release, DOI '+VERSION_DOI_NUMBER} {...externalLinkProps(VERSION_DOI,"noopener noreferrer")}>DOI <span aria-hidden="true">·</span> <span className="record-doi">{VERSION_DOI_NUMBER}</span></a></li>
  <li><a href={OPENAIRE_RECORD} rel="noopener noreferrer" className="provenance-badge" {...externalLinkProps(OPENAIRE_RECORD,"noopener noreferrer")}>Indexed in OpenAIRE</a></li>
  <li><a href={SOFTWARE_HERITAGE_RECORD} rel="noopener noreferrer" className="provenance-badge" {...externalLinkProps(SOFTWARE_HERITAGE_RECORD,"noopener noreferrer")}>Archived in Software Heritage</a></li>
 </ul>;
}
