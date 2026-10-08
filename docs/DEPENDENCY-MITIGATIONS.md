# Local dependency mitigation

## braces depth guard — October 2, 2026

The upstream [GHSA-vfj7-8cjw-p6xm advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects braces through 3.0.3. Recursive AST walkers can exhaust the Node stack with deeply nested patterns under the existing character limit. The advisory had no published patched version when this change was prepared.

OTR carries a local MIT-licensed fork in vendor/braces, based on the installed braces 3.0.3 source. Its package is named **@opentaskrelay/braces**, version **3.0.3-otr.1**. This is an OTR mitigation, not an upstream release or upstream assurance. The original copyright and license are preserved in [vendor/braces/LICENSE](../vendor/braces/LICENSE).

The npm override routes every braces dependency to this local package. The parser rejects brace and parenthesis AST nesting beyond 100 before the recursive walkers run. Public compile, expand and stringify paths also validate supplied ASTs iteratively, rejecting excessive depth and repeated nodes.

[Regression tests](../tests/dependency-guards.test.mjs) exercise the reported 4,000-level input, raw AST bypasses, the installed micromatch integration, and ordinary glob/range behavior. They also verify that the installed dependency is the local fork. These tests run in the existing security check.

npm audit still runs at the existing high-severity threshold. It no longer classifies the local, modified package as the unmodified upstream release; passing audit alone does not validate this mitigation. The reviewed source and regression tests provide that evidence. No advisory allowlist or severity downgrade is introduced.

Remove the override only after a maintained upstream replacement or patched release is reviewed, the regression tests pass against it, and both operational and public source carry the same lockfile.

## Satori fflate patch — October 8, 2026

The vinext 1.0.1 update brings @vercel/og 1.0.3 and Satori 0.33.x. Satori pins fflate to 0.7.3, including in 0.33.5. [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) affects that version: malformed ZIP64 input can make unzipSync loop forever. Its four audit entries represent this single advisory and the fflate → Satori → @vercel/og → vinext dependency chain.

The scoped `satori.fflate` override selects the maintained **fflate 0.7.5** patch on the same 0.7 release line. It fixes bounds checking in ZIP64 extra-field parsing without replacing Satori or downgrading vinext. No audit finding is suppressed. The required dependency security suite checks normal ZIP roundtripping and rejects the malformed missing-extra-field case in a subprocess with a four-second deadline; the unpatched 0.7.3 negative control times out.

Remove the override when Satori declares a patched fflate dependency, after reviewing the replacement and passing the same regression and publication checks. Operational and public source must carry the same manifest dependency sections and lockfile.

## Cloudflare tooling update remains blocked

The independent lucide-react, react-day-picker, react-resizable-panels, Vite and vinext updates are split from the proposed @cloudflare/vite-plugin 1.62.5 / Wrangler 4.147.0 pair. Retain the working **1.62.0 / 4.129.1** pins and patched Undici **7.29.1** until [issue #55](https://github.com/lanekingsbery/open-task-relay-public/issues/55) acceptance is met. No production HTTP 421 behavior or existing application assertion is changed.

Miniflare 5.20261001.0-alpha with Undici 7.29.1 reproduces `UND_ERR_REQ_CONTENT_LENGTH_MISMATCH` on the tiny HTTP 421 Worker from issue #55. The maintained Undici 7.30.0 update and Miniflare 5.20261006.0-alpha also fail that reproduction. [Upstream request-preservation change #15906](https://github.com/cloudflare/workers-sdk/pull/15906) preserves known body length/source and exposes automatic HTTP 421 replay; the retry consumes an exhausted body while still declaring its original length. A dispatcher trace observes two bytes on the first POST and zero on the retry. A normal Undici HTTP control sends two identical bodies successfully. The proposed bundle's unchanged built-Worker/fresh-agent alias POST assertion fails before it can verify 421/no Location. [Upstream issue #16141](https://github.com/cloudflare/workers-sdk/issues/16141) contains the minimal reproduction, tested versions and body trace.

The security suite now also runs the tiny reproduction on both installed Miniflare paths. A replacement must preserve exact request bytes on every permitted retry, strict Content-Length checking, credential-origin boundaries and HTTP 421/no Location, and pass full build/typecheck/application/security/portability/publication/audit/dependency-review/CodeQL acceptance. An intermittent pass or a change to alias rejection semantics is insufficient evidence.
