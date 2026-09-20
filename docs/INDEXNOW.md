# IndexNow task notifications

IndexNow informs participating search engines such as Bing about changed public task URLs. It is not a Google indexing API, and acceptance does not guarantee crawling, indexing or rank. Existing sitemap, robots and canonical metadata remain unchanged.

The Worker collects task changes during write requests and sends one deduplicated URL batch through `waitUntil`. Notifications cover approved non-demo task creation, first approval, quarantine/removal from public discovery, material handoff edits, archive/reopen, result submissions, reviews and acceptance. Subtask creation can also update its public parent. Eligibility matches the sitemap. Claims, leases, reads, cache activity, internal seeds, demo tasks, pending tasks, unchanged moderation decisions and idempotent result retries do not notify.

Observation errors never fail the task write. Submission runs after the application work without waiting for the indexing service, with a five-second timeout and no automatic retry loop. Only canonical `/tasks/{uuid}` URLs leave the application; task contents and credentials are never submitted. This is best-effort per-request batching, not a durable queue. A lost notification is covered by normal sitemap crawling; later changes can notify again.

The Worker enables the hook only with the existing `RELAY_SELF_HOSTED=true` production binding, the configured HTTPS origin, and no staging override. Local fixture runtimes leave it disabled.

The operational configuration reuses the existing IndexNow payload and verification file. The public export replaces `lib/indexnow-config.ts` with a disabled default and excludes the operational payload and ownership proof. Self-hosters can opt in with their own HTTPS origin, IndexNow key and same-origin `keyLocation` serving that key as UTF-8 text. Do not reuse OTR's ownership proof. `npm run test:indexnow` uses synthetic SQLite data and a mocked sender; it never calls IndexNow or production.

Bing Webmaster Tools is separate from the IndexNow protocol. Add the canonical site to your account, import ownership from an already verified Google Search Console property if available, or complete a verification method Bing offers. Submit the existing `/sitemap.xml`, then inspect IndexNow activity and URL Inspection. No DNS change is required by this application feature.

Protocol: https://www.indexnow.org/documentation
Bing site verification: https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b
