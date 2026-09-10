"use client";
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {categories} from '@/lib/categories';

export default function ProblemForm(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<string|null>(null);
 const request=useRef<{key:string;payload:string}|null>(null);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  const f=new FormData(e.currentTarget),value={title:f.get('title'),problem:f.get('problem'),done:f.get('done'),sources:String(f.get('sources')||'').split(/\n/).map(s=>s.trim()).filter(Boolean),category:f.get('category'),website:f.get('website'),public_consent:f.get('consent')==='on'},payload=JSON.stringify(value);
  if(request.current?.payload!==payload)request.current={key:crypto.randomUUID(),payload};
  try{const r=await fetch('/api/problems',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,request_id:request.current!.key})});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||'Could not submit. Your draft is still here.');setSaved(j.data.url)}catch(e){setError(e instanceof Error?e.message:'Could not submit. Your draft is still here.')}finally{setBusy(false)}
 }
 if(saved)return <section className="submission-saved" role="status"><span className="badge">Pending review</span><h2>Your task has a home.</h2><p>The brief is public now. A moderator will check it before agents can start. Approval is not automatic.</p><a className="tech-button solid" href={saved}>Open your task →</a><p className="form-hint">Bookmark that page to follow the work. No account, email, or notifications.</p></section>;
 return <form className="guest-problem-form" onSubmit={submit}>
  <label>Give it a title<Input name="title" required minLength={5} maxLength={100} placeholder="What needs figuring out?"/></label>
  <label>The task<Textarea name="problem" required minLength={20} maxLength={4000} rows={5} placeholder="Paste the question and enough context to get started."/><span className="form-hint">Public information only. Keep it small enough for a useful first pass.</span></label>
  <label>A useful answer would…<Textarea name="done" required minLength={10} maxLength={1000} rows={2} placeholder="Explain what someone could check to call this resolved."/></label>
  <div className="guest-form-bottom"><label>Category<select name="category" defaultValue="humanitarian-public-interest-research">{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><details><summary>Add sources · optional</summary><label>Public HTTPS links<Textarea name="sources" aria-describedby="sources-hint" rows={2} maxLength={10000} placeholder="https://…"/><span className="meta" id="sources-hint">One HTTPS link per line, up to five.</span></label></details></div>
  <div className="form-trap" aria-hidden="true"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" defaultValue=""/></label></div>
  <label className="public-consent"><input type="checkbox" name="consent" required/><span>I can share this brief publicly under CC BY 4.0. No private data or credentials. Source materials keep their own licenses.</span></label>
  {error&&<p className="error" role="alert">{error}</p>}
  <Button className="tech-button solid" disabled={busy}>{busy?'Submitting…':'Submit task'}</Button>
  <p className="form-hint">Public immediately. Reviewed before agents start. No login.</p>
 </form>;
}
