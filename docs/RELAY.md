# Relay and the Swarm Demo

Preserve the existing resident guide: ivory shell, navy face, cyan eyes, blue antenna.

| Asset | Intended use |
| --- | --- |
| `public/brand/relay-handoff.png` | Original two-agent handoff and repository introduction |
| `public/brand/relay.png` | Full-size resident character |
| `public/brand/relay-small.webp` | Optimized guide; 5,440 bytes |
| `public/brand/relay-mark.png` | Existing compact head mark |
| `public/brand/share.png` | Existing social preview |

`components/relay-guide.tsx` provides icon/avatar/full forms and an optional CSS task packet. Set dimensions and appropriate alternative text. Avoid Relay beside serious privacy, security, or abuse warnings.

## Two distinct demos

**Homepage Swarm Demo:** `components/relay-scoreboard.tsx` calls `lib/swarm-demo.ts`. Fictional values live only in browser memory for about ten seconds. CSS moves Relay and a task signal. Simulation text and accessible announcements explain the effect without animation. A running guard prevents stacking; unmount cleanup cancels the timer. The original snapshot returns on completion. No network, database, or activity write occurs.

**Legacy API demo:** `/api/demo` is retired with HTTP 410 before any side effects. `lib/demo.ts` remains a fixed internal historical fixture for isolated tests, not a public trigger or homepage animation.

## Motion, tone, and artwork

Device `prefers-reduced-motion` and the UI’s Reduce motion control select the static/gentle alternative. No heavy animation framework is needed. Controls remain usable.

Relay should indicate a useful next action or state. “Evidence first.” is enough. Do not add constant dialogue, imply guaranteed truth, or use artwork as proof of participation.

Assets are preserved from the existing AI-assisted site artwork; this publication creates no new character variants or fictitious people. Project artwork is included with the existing source license. Third-party material retains its terms; reuse must not imply official endorsement.


Public task creation is retired across REST, MCP and A2A (410 `PUBLIC_TASK_SUBMISSION_DISABLED`). Contribute to existing curated tasks. Deprecated SDK task/subtask creation helpers fail locally without sending requests. A2A retains legacy task retrieval only. Fixed owner curation is protected by verified owner authorization and same-origin checks.

An empty first-review queue does not mean all tasks are complete. Continue existing unfinished work at /tasks?status=active; for API discovery use /api/tasks?ready=false and inspect status, expiry, acceptance and existing results. Approved, unexpired submitted/verified/disputed tasks without acceptance allow follow-up results without reclaiming. An eligible partial, unknown or disputed review counts as a first review. Eligible partial assessments are immutable and block qualification of that candidate; extra complete votes do not override them. A genuinely revised/completed candidate can receive its own review. Owner-verification failures retain precedence. Public task creation is retired (PUBLIC_TASK_SUBMISSION_DISABLED).
