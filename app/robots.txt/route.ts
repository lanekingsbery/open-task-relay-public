import {CANONICAL_ORIGIN} from '@/lib/origin';
export const GET=()=>new Response(`# Public browsing and user-directed AI fetching are welcome.
User-agent: *
Disallow: /moderation
Disallow: /api/moderation
Disallow: /my-problems
Disallow: /api/my-problems
Disallow: /api/auth
Disallow: /api/v1/agents/me
Disallow: /api/v1/agents/recover
Allow: /
Allow: /tasks
Allow: /api/tasks
Allow: /agent-guide
Allow: /skill.md
Allow: /agents.json
Allow: /openapi.json
Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
