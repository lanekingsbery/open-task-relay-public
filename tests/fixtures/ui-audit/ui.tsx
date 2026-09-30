// Synthetic, loopback-only browser fixtures. API calls are intercepted by tests.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import Moderation from '../../../components/moderation';
import ResolutionCard from '../../../components/resolution-card';
import HandoffEditor from '../../../components/handoff-editor';
import TaskRequestForm from '../../../components/task-request-form';
import MeetRelay from '../../../components/meet-relay';
import GuideReview from '../../../components/guide-review';
import HomePrompt from '../../../components/home-prompt';
import '../../../app/globals.css';
const task={id:'11111111-1111-4111-8111-111111111111',title:'Synthetic task A',revision:1,next_action:'Compare dated sources and record uncertainty.',expected_output:'A cited comparison of the two source definitions.',next_action_sources:['https://example.org/source'],next_action_progress:'Record one dated source definition.',acceptance_criteria:['Cite both dated definitions'],relay_leg:{next_action:'Compare dated sources',source_urls:['https://example.org/source'],useful_progress:'Record one dated source definition.',max_minutes:5}};
const secondTask={...task,id:'44444444-4444-4444-8444-444444444444',title:'Synthetic task B'};
async function refresh(){const r=await fetch('/api/moderation');const j=await r.json();if(!r.ok||!j.data)throw new Error(j.error?.message||'Synthetic refresh failed.')}
function HandoffFixture(){const [id,setId]=useState(task.id);return <main className="owner-console form-controls"><h1>Synthetic handoff</h1><HandoffEditor tasks={[task,secondTask]} selectedTask={[task,secondTask].find(t=>t.id===id)||null} onSelect={setId} onSaved={refresh}/></main>}
function ReviewFixture(){const select=(id:string)=>{const url=new URL(location.href);url.searchParams.set('review',id);history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'))};return <main className="prose"><h1>Synthetic selected review</h1><div className="actions"><button onClick={()=>select('22222222-2222-4222-8222-222222222222')}>Select review A</button><button onClick={()=>select('55555555-5555-4555-8555-555555555555')}>Select review B</button></div><GuideReview eligibility="Independent reviewer required; synthetic fixture only."/></main>}
const candidate={...task,result_id:'22222222-2222-4222-8222-222222222222',assessment_status:'complete',assessment_at:Date.parse('2026-09-28T12:00:00Z'),assessment_revision:1,error_code:null,task,assessment:{outcome:'needs_synthesis',summary:'The corrected claim needs a complete synthesis with evidence.',missing:['Final synthesis'],next_action:'Check the corrected source and write a cited synthesis.',source_reads:[]}};
function PrivateFixture({chat=false}:{chat?:boolean}){const [visible,setVisible]=useState(true);return <main className={chat?'relay-home':'prose'}><h1>{chat?'Synthetic Relay chat':'Request a public-good task'}</h1><button onClick={()=>setVisible(false)}>Unmount private surface</button>{visible&&(chat?<MeetRelay/>:<TaskRequestForm/>)}</main>}
const surface=new URLSearchParams(location.search).get('surface');
createRoot(document.getElementById('root')!).render(surface==='resolution'?<main className="owner-console form-controls"><h1>Synthetic resolution</h1><ResolutionCard candidate={candidate} onSaved={refresh}/></main>:surface==='handoff'?<HandoffFixture/>:surface==='request'?<PrivateFixture/>:surface==='chat'?<PrivateFixture chat/>:surface==='guide'?<ReviewFixture/>:surface==='prompt'?<main className="relay-home"><HomePrompt/></main>:<Moderation/>);
