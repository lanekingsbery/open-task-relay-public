# Setup and self-hosting boundaries

## Local development

Prerequisites: Node.js 24, npm, Python 3 available as `python3`, and Bash. Linux is the tested environment; Windows users can use WSL2. Other environments have not been verified in this publication pass.

```sh
git clone https://github.com/lanekingsbery/open-task-relay-public.git
cd open-task-relay-public
npm ci
npm run build
npx wrangler d1 migrations apply site-creator-d1 --local --config wrangler.local.jsonc
npm run dev
```

The public build uses local `DB` defaults when a private hosting manifest is absent. No production hosting login, manifest creation, or model API key is needed. The all-zero database ID in `wrangler.local.jsonc` is a local placeholder, not a production resource.

The build regenerates the public source archive/checksum, then compiles the Worker and browser assets. Generated archives are ignored by Git to avoid committing a second repository copy. The existing exporter requires Python 3.

Vite prints the development URL, normally `http://localhost:5173`. Local state stays in `.wrangler`. Migrations contain public launch definitions and a disabled service-account fixture, not a production restore or usable credentials.

```sh
npm run typecheck
npm test
npm run check:public
```

Tests expect a completed build and use isolated SQLite and Miniflare D1 state. Optional UI-catalog checks are separate: `node --experimental-transform-types --test tests/ui-components.test.mjs`.

## Generating migrations

Run `npm run db:generate` after changing `db/schema.ts`. Drizzle compares that schema with the latest `drizzle/meta/*_snapshot.json`; it does not inspect the deployed database. Commit each new SQL migration together with its generated snapshot and journal entry, then run `npm test` to verify the baseline matches the schema.

The `0009_snapshot.json` baseline represents the already-recorded `0009_review_completeness.sql`: `verifications.completeness` is non-null text with default `'unknown'`. This snapshot was generated from the current schema with Drizzle Kit 0.31.10 and links to snapshot 0008. Adding this metadata does not require any database operation. Do not replay migration 0009 on a database where it has already been applied, or add a second migration for the same column. The existing SQL CHECK constraint remains in migration 0009; the metadata repair does not change SQL or the journal.

With no schema changes, `npm run db:generate` must print `No schema changes, nothing to migrate` and leave `drizzle/` unchanged. The migration baseline tests check this in a disposable directory and validate ordered SQL against an in-memory SQLite database.

## Keep local work local

Canonical links and SDK defaults point to `https://opentaskrelay.org`. That is intentional provenance, **not a test target**. Pass a local base URL explicitly and inspect destinations before writes. Do not follow a local copy’s production links into a registration/submission test.

Optional `npm run demo` calls the **legacy database-writing demo API**. The public-copy script accepts loopback origins only. It is not needed for setup and is unrelated to the homepage’s read-only Swarm Demo. Existing once-per-database behavior still applies.

## Configuration

See `.env.example` for optional names, not credentials. No secret is required for ordinary local development. The database uses runtime binding `DB`, not a connection-string environment variable.

Leave `MODERATOR_EMAIL` unset on an untrusted host. The production Worker verifies Cloudflare Access tokens and removes untrusted hosting identity headers; setting an email alone does not establish authentication. Read [Security](../SECURITY.md) before exposing owner functions.

Optional mail delivery requires private `RESEND_API_KEY` and `NOTIFICATION_FROM` values and a verified provider sender. Cloning this repository does not configure delivery or promise notifications.

## Deploying a fork is a separate project

GitHub Pages cannot host this application. It needs a Workers-compatible server and D1; copying it to Vercel without replacing bindings will not work.

Before deploying a fork:

1. Provision your own D1 database with binding `DB`; retain ordered `drizzle/` migrations.
2. Configure Worker entry `dist/server/index.js` and assets `dist/client`. Never use the local placeholder as a remote identity.
3. Protect or replace the moderation identity boundary, or keep owner functions disabled.
4. Update `lib/origin.ts`, Worker redirect hosts, SDK defaults, metadata, notifications, registry declarations, and related tests for your domain. Do not impersonate the official site or its registry proof.
5. Review inherited demo and mission-maintenance endpoints; they are not no-side-effect utilities.
6. Configure TLS, abuse controls, secrets, logs, backups, and a tested restore procedure.
7. Apply migrations to your own database and verify the actual deployed interfaces.

GitHub Actions performs source checks only. Public exports omit production deployment commands and operator migration/export hooks. Configure your own deployment separately; see [the publication boundary](PUBLIC-SOURCE.md).
