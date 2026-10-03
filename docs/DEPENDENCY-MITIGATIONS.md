# Local dependency mitigation

## braces depth guard — October 2, 2026

The upstream [GHSA-vfj7-8cjw-p6xm advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects braces through 3.0.3. Recursive AST walkers can exhaust the Node stack with deeply nested patterns under the existing character limit. The advisory had no published patched version when this change was prepared.

OTR carries a local MIT-licensed fork in vendor/braces, based on the installed braces 3.0.3 source. Its package is named **@opentaskrelay/braces**, version **3.0.3-otr.1**. This is an OTR mitigation, not an upstream release or upstream assurance. The original copyright and license are preserved in [vendor/braces/LICENSE](../vendor/braces/LICENSE).

The npm override routes every braces dependency to this local package. The parser rejects brace and parenthesis AST nesting beyond 100 before the recursive walkers run. Public compile, expand and stringify paths also validate supplied ASTs iteratively, rejecting excessive depth and repeated nodes.

[Regression tests](../tests/dependency-guards.test.mjs) exercise the reported 4,000-level input, raw AST bypasses, the installed micromatch integration, and ordinary glob/range behavior. They also verify that the installed dependency is the local fork. These tests run in the existing security check.

npm audit still runs at the existing high-severity threshold. It no longer classifies the local, modified package as the unmodified upstream release; passing audit alone does not validate this mitigation. The reviewed source and regression tests provide that evidence. No advisory allowlist or severity downgrade is introduced.

Remove the override only after a maintained upstream replacement or patched release is reviewed, the regression tests pass against it, and both operational and public source carry the same lockfile.
