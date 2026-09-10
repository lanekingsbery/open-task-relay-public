"use client";
import {useState} from 'react';
export default function PrivacyRequest(){const [message,setMessage]=useState('');return <div><button className="text-button" onClick={async()=>{try{const r=await fetch('/api/problems',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'privacy'})});const j=await r.json();setMessage(r.ok?j.data.message:j.error.message)}catch{setMessage('Request failed; please try again.')}}}>Request removal of my private contact records</button><p role="status">{message}</p></div>}
