# Lint verification

Run `npm run lint` on Node 24 after `npm ci`. The command checks application
pages, owned components, libraries, Worker/API code, SDKs, tests and scripts.
Warnings fail verification as well as errors. The existing `verify` workflow
runs lint alongside every prior build, typecheck, security, publication and
regression check; branch protection continues to require that same job.

## Scope and explicit exceptions

`eslint.config.mjs` keeps the framework and TypeScript rule sets active. Build
outputs use the existing generated-output ignores. Owned application and test
files remain in lint scope.

For JSX application code, `otr/no-html-link-for-pages` wraps the unchanged Next
page-link checker and filters only literal, canonical `/api/` destinations. The original
matcher treats route handlers and broad dynamic `[section]` paths as pages,
which incorrectly rejects links to REST JSON. The paired local rule retains
upstream application-page checks; no owned file is excluded. Lint-scope
regressions verify page links still fail while native API responses remain
allowed. Paths that traverse out of `/api/`, including encoded dot segments,
are normalized and checked as application destinations.

The existing vendored shadcn boundary is unchanged: `components/ui/**` and
`hooks/use-mobile.ts` retain their prior unused-variable, purity and state-effect
exceptions to preserve the registry source. All other rules still apply there.

The reviewed `vendor/braces/**/*.js` fork declares `type: commonjs` and exports
its patched parser through `require`/`module.exports`. Only
`@typescript-eslint/no-require-imports` is disabled for that package; an ESM
conversion would change its loader and is outside this cleanup. Other lint
rules remain enabled. The patched depth bounds, dependency pins, license and
vendored source remain intact.

Two owned components retain native images, with only `@next/next/no-img-element`
disabled at their exact file paths:

- `components/home-badges.tsx` displays provider SVG/status badges directly,
  including immutable archive identity badges. Preserve provider URLs and the
  existing Content Security Policy source paths instead of proxying them.
- `components/source-check-badge.tsx` displays the current GitHub workflow SVG
  with its no-referrer policy and error fallback. Direct loading preserves
  provider freshness and its existing request boundary.

Local brand artwork uses `next/image` with `unoptimized` and its existing
preencoded sources, dimensions and loading behavior. Internal application
navigation uses `next/link`; native anchors remain for fragment links,
external destinations and machine/download responses.

## October 3, 2026 cleanup

The dependency-release baseline was **443 errors and 47 warnings** across 107
files. The rule grouping was:

| Rule | Errors | Warnings |
| --- | ---: | ---: |
| `@next/next/no-html-link-for-pages` | 218 | 0 |
| `@typescript-eslint/no-explicit-any` | 204 | 0 |
| `@typescript-eslint/no-require-imports` | 12 | 0 |
| `react-hooks/set-state-in-effect` | 3 | 0 |
| `react/no-unescaped-entities` | 2 | 0 |
| `prefer-const` | 2 | 0 |
| `react-hooks/rules-of-hooks` | 1 | 0 |
| `@next/next/no-assign-module-variable` | 1 | 0 |
| `@typescript-eslint/no-unused-vars` | 0 | 34 |
| `@next/next/no-img-element` | 0 | 8 |
| `react-hooks/exhaustive-deps` | 0 | 2 |
| `import/no-anonymous-default-export` | 0 | 2 |
| `@typescript-eslint/no-unused-expressions` | 0 | 1 |

Link counts are emitted diagnostics; overlapping framework route matches can
report a single anchor more than once. CommonJS findings were configuration
mismatches. The helper called `useCurrentOrigin` did not call hooks and needed
a correct name. The remainder required purpose-checked cleanup, concrete
record/payload types and review of effect/dependency behavior.

No dependency versions change. TypeScript 5.9.3 and the working Cloudflare
plugin/Wrangler remain pinned. The separate [compiler migration](https://github.com/lanekingsbery/open-task-relay-public/issues/54)
and [Cloudflare transport migration](https://github.com/lanekingsbery/open-task-relay-public/issues/55)
remain deferred.

The completed cleanup measures **0 errors and 0 warnings**, including tests and
the existing vendored boundaries. There are no unresolved owned-code findings.
Typed D1 statements, exact query projections and schema-derived records replace
unsafe `any`; incoming JSON and caught errors narrow from `unknown` while
retaining runtime validation and security checks. Missing credential records and
failed request-limit inserts now return explicit errors instead of accidental
property-access failures; malformed owner responses preserve retry uncertainty.

The gallery synchronizes session position through an external store and stable
ordered IDs while retaining hydration and interaction pauses. Navigation closes
disclosures on a pathname change and restores focus on Escape. Operator reads
abort superseded requests and ignore stale responses. Saved request-summary
JSON narrows safely without changing the original audit record. Focused
regressions exercise these behaviors and the precise lint exceptions; all
existing workflow and security assertions remain enabled.
