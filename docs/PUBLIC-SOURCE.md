# Public-source boundary

The operational repository is authoritative for production work. `publication/manifest.json` defines one reviewed, exact-path publication boundary for both a fresh public Git repository and the website source archive. Exporting does not copy Git history, create a repository, deploy, or access a database or secret store.

## Included source

Application pages, task lifecycle and authorization, REST/MCP/A2A interfaces, generic Worker code, public task definitions, schemas and ordered migrations, SDKs, assets, locked dependencies, local build configuration, synthetic tests and fixtures, contributor documentation, source-check CI, and license/third-party notices.

Every selected path is required. New files are not published automatically: add them to the manifest after review. The export contains enough source to inspect, build, test and adapt the core application for an independent installation. Public launch briefs and disabled service-account fixtures remain public; they are not a production restore.

## Private material and public defaults

The manifest excludes deployment/recovery runbooks, operational reports/probes, registry submission records, private hosting configuration, temporary database-export implementation, the old production-derived acceptance fixture, private records and generated output. Actual credentials, backups, environment values and database exports belong outside both Git histories.

A small `replacements` map selects reviewed files from `publication/defaults/`:

- `lib/operational-decisions.ts`: empty owner-acceptance, maintenance, production-check identity, merge and comment-moderation payloads. Generic guarded mechanisms remain in the public libraries. Tests inject synthetic decisions; production continues using its unchanged private decisions.
- `worker/operations.ts`: neutral hook, with no database-export or migration-freeze behavior. Generic owner authentication stays public.
- `lib/registry-proof.ts`: no ownership claim. The official public proof file and registration receipts are omitted; forks configure their own declarations.
- `vite.config.ts` and `.env.example`: independent local binding defaults and configuration names, with no private hosting integration or migration-export settings.
- Public CI: validates the actual exported tree and runs local source tests, without deployment credentials.

Only package scripts listed in the manifest are published. Production deployment commands and managed-host installation wrappers are omitted. Dependency versions and the lockfile remain unchanged. Included default files make an exported checkout capable of reproducing the same source export without the private repository.

## Local commands

```sh
# Validate the projected public source without writing files.
npm run check:public

# Write a fresh tree; the destination must not exist.
python3 scripts/export-source.py --output /tmp/otr-public-source

# Inspect the actual tree: unexpected or missing files fail.
node scripts/check-public-source.mjs --tree /tmp/otr-public-source

# In an exported checkout after dependencies/builds exist:
npm run check:public -- --tree . --allow-generated
npm run test:publication
npm run typecheck
npm run build
npm test
npm run test:security
```

`--allow-generated` ignores only known local dependency/build locations and Git internals while checking the actual tree; it never adds them to publication. Without that flag the tree check is strict. The default check validates the publication projection, so intentionally private files elsewhere in the operational workspace do not block its build.

The default exporter command writes `public/source/opentaskrelay-source.tar` and `checksum.json`. `npm run build` already invokes it. Files are sorted, archive ownership/timestamps/modes are fixed, and unchanged inputs produce identical archives. Both output modes use the same projection and checks.

Checks reject missing required files, unexpected tree entries, symlinks, missing literal local imports/test resources, broken documentation links, unexpected package scripts, obvious credentials and hosting identifiers. Diagnostics identify paths/reasons, never matched credential values. These bounded checks are not a full security audit or a complete parser for computed imports; typecheck, build and isolated tests remain required.

## Fixtures and publication workflow

`tests/fixtures/owner-acceptances.synthetic.json` contains three invented examples with example.org evidence links. Tests derive their expected decision hashes from those fixture contents. Maintenance tests similarly use invented task IDs. No production result, review, contact record or bearer credential is copied to make tests pass.

After reviewing an isolated export, initialize fresh public history from that tree. Review public contributions into the operational workspace and publish subsequent snapshots through the same boundary. Keep operational deployment automation attached to the private repository. Repository visibility and website/source-link changes are separate authorized steps; this tooling does neither. Existing public copies and archives cannot be recalled by changing visibility.

Preserve the MIT license and all included copyright/third-party notices. Task contributions and linked source material retain their separately stated terms. The auditable, contributor-facing source is published at [https://github.com/lanekingsbery/open-task-relay-public](https://github.com/lanekingsbery/open-task-relay-public). Production operations are maintained separately; publish subsequent source updates through this same boundary.
