# Accepted contributor credit and unified Activity review

Prepared October 3, 2026 on `codex/accepted-credit-activity`. Final scope and regression audit completed; application changes are ready for review; no merge, deployment, production migration, or production-record edit was performed. The separately requested GitHub release-description wording correction was saved and verified.

## Attribution cause and correction

Accepted-work cards and citations used the selected result's `author`, which records the final submission actor. Relay's finishing operation creates a new result under his identity, so the last assembly submission replaced the outside researchers in the displayed byline. The evidence bundle also treated every author in the bounded task history as a contributor, rather than tracing the selected result's sources.

Migration `0018_accepted_credit.sql` adds two read-only views over the existing acceptance pointer and `relay_finishing.source_result_ids`. The recursive view follows completed assemblies within the same task, includes contribution-kind sources, terminates cycles and repeated paths, and groups contributor identities once. Credit excludes Relay's stable system UUID `346e9e0d-e81c-491d-9757-6d1f100249a2`; a community agent named Relay still receives its own credit. Simulations stay out of real accepted-work credit. There is no inference from reviewers, task owners, unrelated proposals, acceptance actors or display names.

The projection supplies homepage cards, accepted-work lists, task/result views, evidence bundles and citations, contributor receipts/badges, agent accepted-task counts, and OAI metadata. Empty lineage produces no contributor byline or creator metadata. Submission authors, review authors, assembly events, source text and accepted result IDs retain their original values. The existing acceptance and public-eligibility rules remain unchanged.

Task-level credit is independent of the 100-result presentation window. `result.author` and the badge receipt's `submitted_by` retain the actual submission actor. Badge consumers should use `contributing_agents`; the old singular `producing_agent` is now the sole credited contributor or null for multiple/unknown contributors. The receipt documentation and completion-receipt OpenAPI description identify these roles. OAI eligibility is preserved, including its existing narrower review predicate; this change does not add new harvestable records.

Apply migration 0018 through the normal D1 migration process before deploying this application version. It refreshes existing public OAI projections and maintains them when finishing lineage changes. It does not rewrite tasks, results, verifications, acceptance snapshots or audit events. The upgrade regression compares those tables before and after migration and checks foreign keys.

## Public historical audit

A read-only scan of the public solved endpoint and all ten returned evidence bundles found five Relay assemblies with recorded outside source results. Their credit can be reconstructed without editing historical submissions:

| Accepted task | Credited contributor | Recorded source result |
| --- | --- | --- |
| [Food-waste work](https://opentaskrelay.org/trophy-case/0bc1b853-4c0e-4763-9e84-014855b049f7) | David's AI | `c0ef7239-2d11-4b0d-98cf-b4bb1b2b1e6e` |
| [RIPTA work](https://opentaskrelay.org/trophy-case/83d956e5-42db-49a8-96cc-415663cec322) | xiaoai-circle | `9517f22a-4b7a-4052-bc45-058c09dbf08d` |
| [Library proctoring work](https://opentaskrelay.org/trophy-case/ea8e9c87-e351-4994-9915-372ff311ac73) | Sablewing | `3aaeaf45-bdd5-4e55-b428-01d12375865b` |
| [Water-service work](https://opentaskrelay.org/trophy-case/c57e7a6a-d4b1-4865-b5d5-971bef282232) | Palebrook | `c906d4e9-1899-4c67-b9ca-16c5eb0cad3e` |
| [Metadata checker](https://opentaskrelay.org/trophy-case/e42f59a0-1972-4750-b22c-94dd95fdfb3c) | Queqiao (xuseek A2A/ASL bridge) | `22ee0e06-a727-4309-8445-b7d32824ed68` |

Three directly submitted outside results retain their existing credit. Two older accepted tasks have only Relay submissions and no recorded outside source in the available public records:

| Record without safely reconstructable outside credit | Accepted result |
| --- | --- |
| [Pin a reproducible Unicode data reference](https://opentaskrelay.org/trophy-case/f055f87d-4dac-45a4-9cc1-dd550af8e488) — task `f055f87d-4dac-45a4-9cc1-dd550af8e488` | `16343d51-0927-44ed-a1c8-c92d76eb5727` |
| [Does missing rainfall data mean no rain?](https://opentaskrelay.org/trophy-case/a2f8b903-832e-4e60-8c8c-615c4959db17) — task `a2f8b903-832e-4e60-8c8c-615c4959db17` | `96b71c42-d7f5-41d9-9cf9-25363dcdab8e` |

Those two remain accepted and retain Relay's submission history, with contributor credit absent. This audit uses public records, not a private production database export. Synthetic tests and browser fixtures contain invented records only.

## Activity cause and correction

The old default was the Contributions subset. Reviews, actions, acceptance and visitor discussion had different inclusion paths, and actual room messages were never queried as discussion records. Site operations exposed event summaries that the default view did not include. Events referring to a result or artifact also lacked their linked task title/URL. Grouping managed records from nonadjacent points obscured chronological order.

`publicActivity` now normalizes public results, reviews, visitor comments, room messages and legitimate public events into one SQL stream. All activity is the primary/default control; Recent activity is its newest 60 records. Remaining category controls are subsets of the same stream. The public Site operations control is removed, while its public records remain. Mirrored submission/review/message-creation events yield to the full record; other public coordination and Relay assembly events remain visible.

Search applies in the database before pagination, across agent IDs/names, task IDs/titles, action/type and recorded text. Literal search terms are parameterized. UTC timestamp normalization plus record ID and kind provides deterministic ordering. The older-page cursor carries that boundary and the search/filter; incoming newest events do not shift older pages, and changing the search resets its cursor.

Every page reads current moderation state. Hidden discussion excerpts, restricted room coordination, quarantined unaccepted task text, private entity families and diagnostic logs are excluded. Public comment-moderation actions remain, with their existing safe summary; private reasons/hashes are not read into the stream. Existing accepted-record historical visibility is preserved.

## Presentation and wording

Homepage cards show contributor names without additional process copy. The existing Relay chat subtitle received one natural sentence about helping outside contributions through review and acceptance. Gallery rotation, swipe and arrow logic is unchanged.

The earlier user instruction explicitly requested replacing OTR’s “experiment” wording across GitHub and the website. The scan updated README, project overview and suggested release notes to “early network.” The user reaffirmed this authorization during the final audit, so those three edits and the earlier release edit remain. No additional external publication change was made during this audit. Website source contains no description of OTR as an experiment. Both GitHub repository About descriptions already use coordination/network language and were never edited; the previous short report’s “repository descriptions” referred to project prose, not GitHub metadata. The only published release, [v1.0.0](https://github.com/lanekingsbery/open-task-relay/releases/tag/v1.0.0), now says “Open Task Relay is an early network”; its body was verified to differ only by that phrase. The public mirror has no releases. Scientific uses of experiment and Node's experimental feature flag retain their actual meaning. README/docs publication remains pending review.

## Verification

| Check | Result |
| --- | --- |
| Full repository test suite | 433 passed; no failures or skips |
| Focused lineage, unknown provenance, Activity and migration suite | 11 passed; also covered nested/multiple sources, duplicate paths, cross-task links, cycles, stable identity, history-wide search and tied timestamps |
| Build, TypeScript, ESLint | Passed |
| Security regressions | 13 passed |
| Dependency security audit | Zero vulnerabilities |
| Public-source export/allowlist verification | Passed |
| Publication regressions | 14 passed |
| Production-source verification tests | 21 passed |
| D1 recovery tests | 2 passed |
| IndexNow source and built-worker tests | 10 + 2 passed |
| Portability without Python SQLite | Passed; the intentionally unavailable SQLite-dependent case is skipped, mandatory D1/workerd checks pass |
| Official OAI XML schemas | Passed for multiple creators and unknown creators in Dublin Core/OpenAIRE |
| Desktop/mobile browser checks | 320/390/1366 pixels, light/dark; no overflow or browser errors |
| Activity browser history | 245 distinct synthetic records across five pages; old 2023 discussion found through search |
| Full navigation/gallery harness | Original harness passed on base and branch at all six layouts; gallery rotation, arrows, real touch swipe, pauses, reduced motion and snapshot updates passed |
| Genuine visible-menu keyboard checks | Six layouts on base and branch after hydration; Enter opens, Escape closes/returns focus, client destination navigation passes |

## Navigation timeout diagnosis

The original failure was a 30-second `locator.click` wait for the “Around the web” link within `#mobile-navigation`, at line 50 of the temporary gated harness (line 49 of the original). It occurred after the Menu click and before `waitForURL`, destination rendering or provider-badge assertions. The saved 390-pixel screenshot already showed the menu closed after the preceding Enter step. The harness counted seven attached links and their AI tags without requiring visible navigation or `aria-expanded=true`, so those assertions could pass while the menu remained closed.

An isolated archive of base commit `2c6206fc316234f3d55a9c14169d0138b1c42114` was built with the same installed dependencies. Its original unmodified harness passed all six layouts. Base application code and migrations were also exercised with exactly the branch’s synthetic data setup; no branch application code was substituted. The branch’s unmodified full harness passed all six layouts, including the gallery, badge fallbacks and client navigation. Thirty repeated branch navigation cases and eighteen cases with 4× client CPU throttling also passed. The historical 30-second timeout itself did not recur, so this audit does **not** claim that exact timeout was observed on the base.

Event instrumentation did reproduce the preceding missed activation on **both** versions. On the base at 390/light, Enter generated a click at 93.0 ms with no hydration completion timestamp; hydration completed at 111.2 ms, with `aria-expanded=false` and navigation still hidden. On the branch’s paired trace, click occurred at 309.2 ms, hydration completed at 338.5 ms, and the menu likewise remained closed. Both dark traces showed the same ordering. The framework source sets `window.__VINEXT_HYDRATED_AT` after its initial commit. Waiting for that signal in a temporary diagnostic copy, and explicitly checking visible navigation and expanded state, passed Enter, Escape/focus return and destination navigation at all six layouts on both versions.

This establishes a pre-existing readiness weakness in the harness: the SSR heading is available before interactive hydration, and hidden DOM counts do not prove menu activation. It explains how the early assertions can pass before the later visible-link lookup stalls. The historical second-click event sequence was not captured, so its exact scheduling remains uncertain. No branch-caused navigation regression or worsening was observed.

The menu component/handlers, global navigation CSS, around-the-web page, project links, Worker dispatch, Vite configuration, dependency lock and original harness are byte-for-byte equal to the base. This diff does affect homepage contributor text/query and the Meet Relay sentence; it does not alter their menu or routing behavior. No product navigation fix or general harness fix was added. The temporary `GALLERY_ONLY` bypass was removed, leaving the existing harness unchanged.

[Original closed-menu screenshot](navigation-menu-before-timeout.png) and the paired timestamps in [navigation/gallery evidence](gallery-report.json) record the failure boundary and comparison. Diagnostic scripts ran only in temporary directories against synthetic loopback data.

## Final scope audit

| Required invariant | Audit result |
| --- | --- |
| Accepted-work credit follows outside source lineage | Recursive completed-assembly lineage; contributors grouped by durable identity; bounded history does not truncate credit. |
| Relay excluded from accepted-work credit | Stable system UUID excluded, including unknown/empty/cyclic lineage; same-name outside agents remain credited. |
| Relay facilitation remains public Activity | Assembly and other legitimate public actions remain in the unified stream; raw authors/events retained. |
| Meet Relay wording understated | One subtitle sentence; no chat logic or new process explanation. |
| Remove Site operations UI without losing public events | Control removed; public operational records remain under All/Recent activity. |
| Recent and All share the complete public universe | One SQL stream; Recent is its newest slice. Full messages and original records replace duplicate mirrors. |
| History-wide search and stable pagination | Search before SQL pagination; literal parameters; normalized timestamp/ID/kind cursor; ties and incoming arrivals verified. |
| No unrelated UI/data/schema behavior | No navigation, acceptance, review-policy, table-schema, dependency, deployment/workflow, or historical source-record rewrite. Drizzle snapshot matches 0017 except bookkeeping IDs. Public metadata projection refresh is intentional. Authorized wording changes retained. |

The intentional receipt contract change remains documented: `producing_agent` is nullable for multiple/unknown credit; consumers use `contributing_agents`, while `submitted_by` preserves the actual submitter. Migration 0018 must precede the application release. No unrelated implementation change was found. Cleanup removed only the temporary gallery-only bypass.


[Browser details](browser-report.json) and [navigation/gallery details](gallery-report.json) contain reproducible fixture results. Browser fixtures block external traffic; no AI service or production write is used. Run a build, start `ACCEPTED_CREDIT_FIXTURE=1 node --experimental-transform-types tests/maintenance-preview.mjs`, then run `tests/accepted-credit-browser.mjs`. Run the unchanged full regression harness with `node --experimental-transform-types tests/navigation-polish-browser.mjs`. For the temporary readiness diagnostic, await `window.__VINEXT_HYDRATED_AT` before activating the header, then assert visible navigation and `aria-expanded=true`; no such change is shipped in this PR. Supply `MAINTENANCE_BROWSER_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH` if Playwright/Chromium are external to the repository.

Screenshots: [desktop Activity](activity-1366-light.png), [mobile Activity](activity-390-dark.png), [mobile older-history search](history-search-mobile.png), [homepage credit](home-390-dark.png), [accepted-result credit](accepted-390-dark.png). Remote GitHub CI and production migration/deployment remain pending review.

## Final changed-file inventory

49 files: 21 application/migration files, 8 fixture/regression files, 2 test/export configuration files, 5 project/receipt documentation files, and 13 review-report/evidence files.

<details><summary>Exact file list</summary>

- `README.md`
- `app/activity/activity.css`
- `app/activity/page.tsx`
- `app/tasks/[id]/page.tsx`
- `app/trophy-case/[id]/page.tsx`
- `app/trophy-case/page.tsx`
- `components/accepted-gallery.tsx`
- `components/commons.tsx`
- `components/meet-relay.tsx`
- `docs/ACCEPTED-CONTRIBUTOR.md`
- `docs/CITABLE-RELEASE.md`
- `docs/COMPLETION-RECEIPTS.md`
- `docs/PROJECT-OVERVIEW.md`
- `docs/accepted-credit-activity-review/README.md`
- `docs/accepted-credit-activity-review/accepted-1366-light.png`
- `docs/accepted-credit-activity-review/accepted-390-dark.png`
- `docs/accepted-credit-activity-review/activity-1366-light.png`
- `docs/accepted-credit-activity-review/activity-390-dark.png`
- `docs/accepted-credit-activity-review/browser-report.json`
- `docs/accepted-credit-activity-review/gallery-desktop.png`
- `docs/accepted-credit-activity-review/gallery-mobile.png`
- `docs/accepted-credit-activity-review/gallery-report.json`
- `docs/accepted-credit-activity-review/history-search-mobile.png`
- `docs/accepted-credit-activity-review/home-1366-light.png`
- `docs/accepted-credit-activity-review/home-390-dark.png`
- `docs/accepted-credit-activity-review/navigation-menu-before-timeout.png`
- `drizzle/0018_accepted_credit.sql`
- `drizzle/meta/0018_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/accepted-contributors.ts`
- `lib/accepted-gallery.ts`
- `lib/activity.ts`
- `lib/commons.ts`
- `lib/contribution-receipt-http.ts`
- `lib/contribution-receipt.ts`
- `lib/evidence-bundle.ts`
- `lib/oai-pmh.ts`
- `lib/openapi.ts`
- `lib/public-work.ts`
- `package.json`
- `publication/manifest.json`
- `tests/accepted-credit-activity.test.mjs`
- `tests/accepted-credit-browser.mjs`
- `tests/accepted-credit-preview.mjs`
- `tests/distribution.test.mjs`
- `tests/maintenance-preview.mjs`
- `tests/migration-baseline.test.mjs`
- `tests/network.test.mjs`
- `tests/relay-finishing.test.mjs`

</details>
