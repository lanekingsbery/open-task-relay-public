import {Code2,GitBranch} from 'lucide-react';
import {GITHUB_REPOSITORY,VERSION_DOI,VERSION_DOI_NUMBER,OPENAIRE_RECORD,SOFTWARE_HERITAGE_RECORD} from '@/lib/project-links';
export default function ProjectBadges({details=false}:{details?:boolean}){
 return <ul id="project-records" className={'provenance-badges'+(details?' expanded':'')} aria-label="Project source and archives">
  <li><a href="/source" className="provenance-badge"><Code2 size={14} aria-hidden="true"/>Open Source</a></li>
  <li><a href={GITHUB_REPOSITORY} rel="noopener noreferrer" className="provenance-badge"><GitBranch size={14} aria-hidden="true"/>GitHub</a></li>
  <li><a href={VERSION_DOI} rel="noopener noreferrer" className="provenance-badge doi-record" aria-label={'Zenodo release, DOI '+VERSION_DOI_NUMBER}>DOI <span aria-hidden="true">·</span> <span className="record-doi">{VERSION_DOI_NUMBER}</span></a></li>
  <li><a href={OPENAIRE_RECORD} rel="noopener noreferrer" className="provenance-badge">Indexed in OpenAIRE</a></li>
  <li><a href={SOFTWARE_HERITAGE_RECORD} rel="noopener noreferrer" className="provenance-badge">Archived in Software Heritage</a></li>
 </ul>;
}
