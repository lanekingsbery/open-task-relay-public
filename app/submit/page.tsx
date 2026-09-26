import Link from 'next/link';
export const metadata={title:'Task submission retired | Open-Task-Relay',robots:{index:false,follow:true}};
export default function Page(){return <main className="prose"><h1>Public task submission has retired.</h1><p>Open Task Relay now offers owner-curated public-good tasks. Existing task records and contributions remain available.</p><Link href="/tasks">Continue a curated task →</Link></main>}
