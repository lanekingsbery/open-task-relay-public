# Moderation and completion discovery usability review

Compared with main `98340af` on 2026-10-03. Screenshots mount the actual moderation components with identical synthetic records. All browser API writes are intercepted; requests outside loopback are blocked.

Moderation now opens on work acceptance, task proposals and reported problems. Cards show requirements or the reported issue, specific decision buttons, expandable evidence and history, blank decision reasons and optional blank conclusions. Recorded review IDs and the saved publication hash/revision travel with the decision. Successful decisions identify the outcome and link to the next item. Stale decisions retain drafts; uncertain writes pause further decisions.

Normal starter tasks, recommendations, review discovery and Best next step prioritize suitable completion checks. Items include the exact candidate, contract, eligibility and review action. Explicit filters, active claims, partial assessments, disputes, holds and recorded required research gaps remain respected. Passing review leaves acceptance pending. Acceptance predicates, authentication and contributor credit are preserved. Report resolution appends a private audit event and retains the original report and content.

The wording audit covered today's released finishing and accepted-credit changes and their maintained instructions. Internal keys, stored evidence and contributor text retain their original wording. The existing homepage Meet Relay section is unchanged.

Ballard Locks was inspected through public GET requests only. Its latest candidate still records a required visitor/pedestrian notice comparison while the live handoff suggests generic review. The generic discovery fix reads the latest linked finishing assessment and retains that specific research step. No task IDs, topic exceptions or live changes are included in the implementation.

## Before and after

| Surface | Before | After |
| --- | --- | --- |
| Moderation, desktop | [Before](before-moderation-1366.png) | [After](after-moderation-1366.png) |
| Moderation, mobile | [Before](before-moderation-390.png) | [After](after-moderation-390.png) |
| Relay proposals, desktop | [Before](before-proposals-1366.png) | [After](after-proposals-1366.png) |
| Relay proposals, mobile | [Before](before-proposals-390.png) | [After](after-proposals-390.png) |

## Validation

- Build, lint with zero warnings, typecheck and public-source validation.
- Full suite: 438 passing tests, including actual built-Worker protected decisions and report privacy.
- Security, portability, IndexNow unit/built-Worker, production-source, D1 recovery and publication checks; dependency audit reports no vulnerabilities.
- Chromium at 1366 and 390 pixels: accept, request changes, reopen, task publication, report resolution, reviewed draft preparation and exact saved Relay draft publication. Keyboard operation, visible outcome/next-item links, stale response recovery and uncertain writes are covered.
- Layout checks at 320, 768 and 1366 pixels in light/dark themes: no horizontal overflow, visible keyboard focus and 44-pixel decision buttons. Desktop/mobile screenshots were visually inspected. [Browser report](after-browser.json).

Reproduce after building: run `node --experimental-transform-types tests/maintenance-preview.mjs`, then `MAINTENANCE_BROWSER_MODULE=/absolute/path/to/playwright/index.mjs node tests/usability-browser.mjs after`. The browser harness uses an existing Playwright/browser installation and adds no production dependency. Other browser engines and live moderation were not exercised.

No merge, deployment, inference, database migration or live moderation action was performed.
