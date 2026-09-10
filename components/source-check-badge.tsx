'use client';
import {useState} from 'react';
import {GITHUB_CHECK_BADGE} from '@/lib/project-links';
export default function SourceCheckBadge(){
 const [failed,setFailed]=useState(false);
 return <span className="source-check-status">{failed?<span className="source-check-fallback">View current checks ↗</span>:<img src={GITHUB_CHECK_BADGE} alt="GitHub Actions source checks: current status" height="20" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</span>;
}
