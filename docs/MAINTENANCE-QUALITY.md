# Maintenance & Quality verification

Based on main `365d4b10304cc993d6fbbb4a92045bf83ad5ca83` (PR #77). All database fixtures and screenshots are synthetic and local. Inference is mocked. No production task records, model settings, spending limits, migrations, dependencies, or owner authority changed.

The regression fixtures cover an eligible pending correction behind 20 completed assessments, authoritative handoffs outside the first 100 editable tasks, search before pagination, revision changes during inference, and immutable decision retries. Mounted browser checks cover assessment completion after mount, preservation of unsaved owner edits, unavailable versus stale task data, all assessment states, a lost decision response, current-page refresh, status-key copying, public receipt links, URL-preserved search, and the numeric-zero rendering bug.

Verification completed:

- `npm run build`, `npm run typecheck`, `npm run check:public`.
- `npm test`: 367 passed initially; one old board-layout assertion was updated, then all 11 rendered-page tests passed. The required portability run subsequently exercised the suite successfully: 367 passed, one environment-specific skip, zero failures. Later UI-only changes received another build, typecheck, rendered-page check and browser pass; malformed decision confirmations received a targeted retry regression.
- `npm run test:portability`, `npm run test:security` (6), `npm run test:indexnow` (10), and built-worker IndexNow checks (2).
- `npm run test:production-source` (21) and `node --test tests/publication.test.mjs` (14).
- `npm run audit:security` passed the required high-severity threshold. Four moderate transitive development-tool advisories remain on the unchanged lockfile.
- Chromium: task board, task details, accepted-work listing, evidence bundle, request form, moderation and Relay operations at 1280, 375 and 390 pixels, in light and dark themes. All 42 screen variants passed overflow and visible-focus checks. Separate screenshots cover loading, empty and error states; recovery clears errors. Representative screenshots below were visually inspected.

Owner fixtures mount the actual components behind mocked local API responses. They do not weaken or bypass production Access. Independent Access tests exercise signed-token and origin protection. The saved uncertain decision is held in page memory: use **Refresh current page** and **Retry saved decision**, and keep the tab open until confirmed. Other browser engines and live provider behavior were not exercised.

To reproduce browser checks after the normal build, start the loopback-only fixture server:

```sh
node --experimental-transform-types tests/maintenance-preview.mjs
```

In a second terminal, use an already-installed Playwright runtime and browser:

```sh
MAINTENANCE_BROWSER_MODULE=/absolute/path/to/playwright/index.mjs \
  node tests/maintenance-browser.mjs
```

The optional browser harness adds no application dependency. `PLAYWRIGHT_BROWSERS_PATH` can point to an existing temporary browser installation; `MAINTENANCE_SCREENSHOTS` selects the output directory. API writes are intercepted, and browser requests outside loopback are blocked. [Browser assertions and screenshot inventory](maintenance-quality/browser-report.json).

Task board, desktop light and mobile dark:

![Desktop task board](maintenance-quality/board-1280-light.png)
![Mobile task board](maintenance-quality/board-390-dark.png)

Request form, mobile light, with visible keyboard focus:

![Mobile request form](maintenance-quality/request-375-light.png)

Synthetic moderation and Relay operations:

![Mobile moderation](maintenance-quality/moderation-390-dark.png)
![Desktop Relay operations](maintenance-quality/operator-1280-light.png)

Synthetic accepted-work evidence bundle, mobile dark:

![Mobile accepted evidence](maintenance-quality/evidence-375-dark.png)
