# UI/UX audit implementation — September 29, 2026

Compared each finding with primary repository main at `94853a5ac07af93f26df371745148ea5f7cb4600` (PR #80). All nine findings still applied. The public mirror was not used as an implementation source.

| Finding | Disposition |
| --- | --- |
| F01 | Moderation reads capture the full query and request generation, abort superseded reads, and ignore obsolete data/errors/loading changes. Unresolved selections cannot decide. Handoff drafts are stored separately by task ID and retain their original revision until explicitly reviewed. |
| F02 | Moderation, ResolutionCard and HandoffEditor announce confirmed mutations before refresh. Failed refresh preserves the receipt and offers read-only Retry refresh. Unconfirmed writes have a separate inspection state; confirmed writes cannot be resubmitted by a refresh recovery control. |
| F03 | Private proposal submission, intake confirmation and status lookup have 15-second deadlines covering fetch and response parsing. Explicit operation messages replace generic busy text. Cancellation and timers are cleaned up on unmount. The ordinary chat reply retains its existing 126-second bound. |
| F04 | Each private attempt captures a key and serialized payload in page memory before submission. Exact retry sends those same bytes. Lookup keys and editable proposal fields are separate. Starting a new proposal generates a new key while keeping earlier keys available for lookup. Captured chat submissions survive trimming ordinary turns. |
| F05 | The requested review ID opens the selected section immediately. Loading, success, failure and retry are visible; known result/task links remain available. Generations and cancellation reject obsolete lookups. |
| F06 | Current state, the exact latest candidate link, criteria and associated review links precede history. The latest candidate and its reviews lead the work record. Older contributions, reviews and source lists remain inspectable in collapsed sections; existing result/review fragments reveal their targets. |
| F07 | Private proposals validate trimmed text, public HTTPS URLs and five-source/five-criteria limits. Handoffs match their separate server limit of ten sources. Adjacent errors have stable associations and invalid controls; drafts stay intact and the first invalid field receives focus. Server validation remains authoritative. |
| F08 | Dark hover uses white on `#27684d`: rendered contrast is **6.617:1**, above 4.5:1. Normal, hover, focus and active states were measured in both themes. Focus and copied announcements remain available. |
| F09 | Removed mobile per-child order overrides. Search, Category, View and Apply follow the same DOM, visual and keyboard sequence at all checked widths. |

## Focused evidence

`tests/ui-audit-browser.mjs` orchestrates observable checks in synthetic loopback fixtures. API routes are mocked for mutations/failures; the built Worker fixture denies outbound traffic. The suite covers reversed moderation/review responses, confirmed writes with failed refreshes, uncertain writes, pending-field locks, exact private retries after edits, unresolved reads/writes, malformed JSON/receipts, unmount aborts, review 404/503/network failures, historical anchors, adjacent form errors, keyboard focus/order, and rendered contrast.

Changed layouts were inspected at **390, 768 and 1366 CSS pixels**, in light and dark themes with reduced motion. The machine-readable [browser report](ui-ux-audit/report.json) records the checks and contrast pairs. Representative screenshots are retained in `docs/ui-ux-audit/`; the runner captures the complete changed-area set under its output directory. Unchanged accepted-work and evidence-bundle layouts reuse [existing maintenance evidence](MAINTENANCE-QUALITY.md).

Representative views:

- [Mobile filter order](ui-ux-audit/board-390-dark.png), [tablet filters](ui-ux-audit/board-768-light.png), [desktop filters](ui-ux-audit/board-1366-light.png).
- [Current candidate on mobile](ui-ux-audit/candidate-390-dark.png), [exact candidate evidence](ui-ux-audit/latest-evidence-390-dark.png), [historical fragment](ui-ux-audit/review-historical-fragment-1366-light.png).
- [Review lookup failure](ui-ux-audit/review-error-390-dark.png), [private validation](ui-ux-audit/request-validation-390-dark.png), [chat timeout recovery](ui-ux-audit/chat-recovery-390-dark.png).
- [Moderation loading](ui-ux-audit/moderation-loading-390-dark.png), [confirmed decision/failed refresh](ui-ux-audit/moderation-recovery-768-light.png), [resolution recovery](ui-ux-audit/resolution-recovery-390-dark.png), [handoff validation](ui-ux-audit/handoff-recovery-390-dark.png).

Run with an already installed Playwright runtime (application dependencies are unchanged):

```sh
npm run build
UI_AUDIT_FIXTURE=1 node --experimental-transform-types tests/maintenance-preview.mjs
# In another terminal; use the installed runtime's actual module path:
MAINTENANCE_BROWSER_MODULE=/path/to/playwright/index.mjs node tests/ui-audit-browser.mjs
```

The previews default to `127.0.0.1:4173` and `127.0.0.1:4174`. The browser output defaults to `/tmp/otr-ui-audit-evidence`. Navigation/Link shims serve only the plain Vite fixture; production uses Vinext. All fixture participation and private keys are synthetic.

## Read-only live moderation check

The existing authenticated Firefox session was inspected through macOS accessibility after access was granted. Three resolution cards were loaded: two failed assessments exposed phase/elapsed-time diagnostics and manual task-handoff recovery guidance, with no automatic assessment retry; the completed assessment was stale (assessment revision 1, task revision 2), and its save control was disabled. The owner-check queue was empty, so a populated review-qualified owner card could not be inspected live. No save, moderation decision, notification, model call or reservation change was performed. Window screenshot capture was unavailable; live evidence is the accessibility inspection, while screenshots and fault behavior use local fixtures.

## Validation boundaries

Required repository checks passed against the final change set: build, typecheck, 372 repository tests, public-source checks, dependency audit (zero vulnerabilities), IndexNow and Worker tests, production-source tests, publication tests, security tests, and portability. The optional UI-catalog check passed three cases and failed the `scroll-fade-reveal-b` scrolling-utility emission assertion. The same 3-pass/1-fail result was reproduced after a successful build of unchanged main `94853a5`, using the identical lockfile and dependencies. This inherited catalog failure remains outside the nine findings. The focused browser suite passed 20 checks and captured 67 changed-area screenshots; 27 representative images are retained here. Existing ESLint errors in affected files were compared with the same files at `origin/main`; this change adds none. They concern inherited explicit `any` types, internal anchor rules and unescaped text. TypeScript checks remain separate and pass.

This is a UI recovery/navigation change. Owner authority, acceptance/independence rules, append-only records, server revisions, API contracts, inference limits and spending reservations remain unchanged. No production write, paid inference, merge or deployment is part of this PR.

AI assisted the implementation and regression checks; all reported evidence was obtained from the local fixtures or the read-only live session.
