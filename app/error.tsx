"use client";
import {RelayCue} from '@/components/relay-guide';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="prose"><RelayCue><h1>The public record is temporarily unavailable.</h1></RelayCue><p>Something went wrong while loading this page. Please try again.</p><button className="tech-button solid" onClick={reset}>Try again</button></main>}
