// Synthetic browser fixtures only. The browser test intercepts every API call;
// these components never receive owner credentials or production records.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Moderation from '../../../components/moderation';
import RelayOperatorView from '../../../components/relay-operator-view';
import ResolutionCard from '../../../components/resolution-card';
import TaskRequestForm from '../../../components/task-request-form';
import '../../../app/globals.css';
function ResolutionFixture(){
 const [status,setStatus]=useState<string|null>(null),[revision,setRevision]=useState(1),[available,setAvailable]=useState(true),[assessmentRevision,setAssessmentRevision]=useState(1);
 const candidate={id:'11111111-1111-4111-8111-111111111111',title:'Synthetic correction beyond the first inventory page',result_id:'22222222-2222-4222-8222-222222222222',revision,assessment_status:status,assessment_at:Date.parse('2026-09-28T12:00:00Z'),assessment_revision:assessmentRevision,error_code:status==='failed'?'ASSESSMENT_FAILED':null,
 task:available?{revision,next_action:'Prior handoff',expected_output:'A cited comparison.',next_action_sources:[],source_expectations:[]}:null,
 assessment:status==='complete'?{outcome:'needs_synthesis',summary:'The corrected claim needs a complete synthesis with evidence.',missing:['Final synthesis'],next_action:'Check the corrected source and write a cited synthesis. Revision '+assessmentRevision,source_reads:[]}:null};
 return <main className="owner-console form-controls"><p>Synthetic local fixture</p><div className="actions">{['pending','running','deferred','failed','complete'].map(s=><button key={s} onClick={()=>setStatus(s==='pending'?null:s)}>{s}</button>)}<button onClick={()=>setAssessmentRevision(r=>r+1)}>New assessment</button><button onClick={()=>setRevision(r=>r+1)}>Change task revision</button><button onClick={()=>setAvailable(v=>!v)}>Toggle task availability</button></div><ResolutionCard candidate={candidate} onSaved={async()=>{}}/></main>;
}
const surface=new URLSearchParams(location.search).get('surface');
createRoot(document.getElementById('root')!).render(surface==='resolution'?<ResolutionFixture/>:surface==='operator'?<RelayOperatorView/>:surface==='request'?<main className="prose"><h1>Request a public-good task</h1><TaskRequestForm/></main>:<Moderation/>);
