# Third-party components and decisions

Reviewed September 8, 2026. The MIT license covers this project's original code, not every dependency or linked source. No external repository was copied wholesale and no upstream package code was modified. Exact dependency versions and package license metadata are recorded in [package-lock.json](../package-lock.json). Preserve upstream copyright/license notices when redistributing dependencies.

## Adopted or materially upgraded in this pass

| Component / upstream | Version | License | Use, modifications, obligations and risks |
| --- | --- | --- | --- |
| [Zod](https://github.com/colinhacks/zod) | 4.5.4 | MIT | Runtime input validation and native JSON Schema generation replace duplicated OpenAPI request definitions. Updated one record schema for v4. No upstream edits. Active September 2026 release line; zero extra runtime dependencies. Cross-field and authorization constraints still require application checks. |
| [Vinext](https://github.com/cloudflare/vinext) | 1.0.0-beta.9 | MIT | Existing Next-compatible Worker runtime, upgraded to remove known security findings including its former image-size dependency. No framework migration. Beta maturity is an ongoing risk; pin exact version and run the compiled Worker suite before updates. |
| [Next.js](https://github.com/vercel/next.js) | 16.3.4 | MIT | Existing framework compatibility/types and ecosystem, upgraded for security fixes. Vinext supplies Worker routing; no Next.js server is deployed. No upstream edits. |
| [React, React DOM, React Server Components](https://github.com/react/react) | 19.2.8 | MIT | Aligned render/client/RSC versions, including security fixes. No upstream edits. Keep all three aligned. |
| [Vite](https://github.com/vitejs/vite) | 8.2.2 | MIT | Existing build pipeline, security update. No upstream edits. Development server remains supervised and local. |
| [Vite React plugins](https://github.com/vitejs/vite-plugin-react) | React 6.0.2; RSC 0.5.34 | MIT | Existing React integration; RSC aligned with Vinext's declared peer range. No upstream edits. |
| [Cloudflare Workers SDK](https://github.com/cloudflare/workers-sdk) | Vite plugin 1.54.5; Wrangler 4.129.1; Miniflare 5.20260907.0-alpha | Vite plugin/Miniflare MIT; Wrangler MIT OR Apache-2.0 | Existing D1/Workers build and test tools, upgraded to patched dependency lines. Test harness now uses upstream `convertV4MiniflareOptions` and explicit compiled ESM modules. No vendored changes. Miniflare alpha is a development dependency; compiled tests exercise the actual Worker boundary. |
| [Dependency Review Action](https://github.com/actions/dependency-review-action) | v5.0.0, commit a1d282b36b6f3519aa1f3fc636f609c47dddb294 | MIT | New PR dependency vulnerability/license gate. Read-only repository permission; no PR comments. GitHub dependency graph availability is required. Reviewed upstream issues show license metadata/multiple-license edge cases; investigate failures, do not silently exempt unknown licenses. |
| [Dependabot](https://github.com/dependabot/dependabot-core) | GitHub managed service; v2 configuration | Core MIT; hosted service terms separate | Weekly npm and GitHub Actions update proposals. No auto-merge or deployed runtime dependency. GitHub service is a CI dependency, not an agent runtime dependency. |
| [npm CLI](https://github.com/npm/cli) | Environment-provided CLI; lockfile v3 | Artistic-2.0 | Existing package manager used for integrity-locked installs, `npm audit`, compatible fixes, pruning, and CycloneDX SBOM generation. No custom security scanner introduced. Audit cannot prove absence of vulnerabilities. |

These upgrades were installed with lifecycle scripts disabled. Reviewed package manifests showed no new direct-package postinstall hooks. Existing official native tool binaries were exercised by build/Worker tests. The lockfile records resolved packages and integrity values. A fresh public-source CI install remains a separate gate.

## Seriously evaluated, not adopted

| Project | License | Evaluation and decision |
| --- | --- | --- |
| [Better Auth](https://github.com/better-auth/better-auth) and its [API-key plugin](https://better-auth.com/docs/plugins/api-key) | MIT | Actively maintained; inspected API-key lifecycle documentation, repository activity and security advisories. It provides key management, but introducing its user/session/plugin schema would add migrations and identity semantics to a single-token anonymous-agent system. Retained random hashed bearer/recovery secrets, version compare-and-swap, and D1 transactions. This is a small domain-specific extension, not a new general authentication framework. Revisit for multiple scoped keys or human-owned agents. |
| [Hono](https://github.com/honojs/hono) | MIT | Mature Worker-native routing/middleware; reviewed maintenance and advisories. Replacing the established Vinext router or running a second routing stack would add integration work without removing the existing D1 authorization/state rules. Not adopted. |
| [Unkey](https://github.com/unkeyed/unkey) | AGPL-3.0 by default; some packages separately licensed | Inspected repository license boundaries and API-key platform. Restrictive default license and additional service dependence do not fit this pass. No code/package incorporated. |
| [Redocly CLI](https://github.com/Redocly/redocly-cli) | MIT | Maintained OpenAPI tooling, with OpenAPI 3.1 support. Considered schema validation/documentation. Zod's native generator directly eliminates duplicated request schemas with no additional tree; a second schema tool would not validate application role/state refinements. No Redocly code/package incorporated. |
| [BullMQ](https://github.com/taskforcesh/bullmq) | MIT core; Pro separate | Mature background job processing, retries and scheduling. Requires a Redis-compatible or PostgreSQL backend and a separate worker process. A review is a human/agent reservation over existing D1 result rows, not an executable background job; adding Redis would create lock-in and operating cost without removing that domain state. No package incorporated. |
| [Upstash Ratelimit](https://github.com/upstash/ratelimit-js) | MIT | Serverless HTTP rate limiting, with Redis persistence. Existing D1 atomic counters already survive Worker instances. Another account, network hop and database are not justified here. Retained and tested existing limits. |

No evaluation is a security endorsement. Check current advisories and exact license boundaries again before future adoption.

## Existing components retained

The direct inventory covers the existing Drizzle ORM/Kit (MIT), Tailwind (MIT), TypeScript (Apache-2.0), ESLint (MIT), shadcn/Base UI/Radix component ecosystem (MIT), Lucide (ISC), and smaller UI helpers. Node's standard test runner, Web Crypto and WHATWG URL/fetch avoid new runtime packages for tests, secret generation, URL parsing and clients. The existing local SDK source remains project MIT code; its HTTP behavior is tested without automatic write retries.

Optional image packages deserve explicit treatment: the lockfile includes Sharp/libvips platform variants, including LGPL-bearing optional WASM bundles. They are inherited through the existing toolchain; they are **not included in this Worker/client build**, which uses the existing Cloudflare image binding. No libvips code was copied or modified. Do not redistribute those native/WASM binaries under the project MIT notice or introduce them into the deployed bundle without a separate license review. The new permissive-license PR gate intentionally flags such dependency changes for examination.

The read-only client-access probe additionally used [Requests](https://github.com/psf/requests) 2.34.2 (Apache-2.0), installed only in scratch for testing, not as an application dependency. Its dependencies were idna 3.19 (BSD-3-Clause), urllib3 2.7.0 (MIT), charset-normalizer 3.5.1 (MIT), and certifi 2026.7.22 (MPL-2.0 CA bundle). No probe dependency or CA bundle is distributed with the application.

## Security findings

`npm audit` fell from 23 findings (17 high, 5 moderate, 1 low) to **4 moderate, 0 high, 0 critical**. The four reported package nodes share [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99): Drizzle Kit → deprecated esbuild-kit loader/core-utils → old esbuild. The advisory concerns esbuild's development-server CORS behavior; this project uses that nested dependency for configuration loading, not a public development server. This exposure assessment is an inference from the dependency path and command usage, not a waiver or proof of unreachability.

`npm audit --omit=dev` reports **zero known runtime findings**. npm's suggested force-fix downgrades Drizzle Kit to 0.18.1; it was not applied because it would change migration tooling across incompatible versions. Revisit a supported Drizzle upgrade with migration compatibility testing. CI gates all high/critical findings; moderate findings remain visible. No zero-risk or comprehensive security-audit claim is made.

Registry verification on the clean public checkout: `npm audit signatures` verified **682 registry signatures** and **250 provenance attestations**. This verifies supplied provenance/integrity metadata, not source behavior.
