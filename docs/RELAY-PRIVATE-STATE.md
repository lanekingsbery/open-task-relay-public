# Relay PR 2: private state and disabled executor

Relay remains disabled. The migration creates eight empty private tables; the
unconnected executor validates proposals and records **denials only**. Its SQL
constraint rejects executable outcomes. No environment flag can enable it.
There are no action adapters, approval issuer/consumer, network/model clients,
owner or public routes, Cron, new MCP tools, task curation or proposal inbox.

## State and security boundary

- `relay_leases`: one maintenance lease, fresh random run ID, monotonically
  increasing generation, fixed 60-second expiry; no renewal API yet.
- `relay_runs`: source/policy version, generation, lifecycle, counts/error codes.
- `relay_observations`: bounded redacted state and typed source references.
- `relay_check_state`: last success distinct from last attempt.
- `relay_incidents`: unique stable fingerprint, failure history, acknowledgement
  expiry and observation reference. No automatic acknowledgement/resolution yet.
- `relay_actions`: unique key, digest, target/evidence references, fixed denial
  reason, outcome/times, approval/model slots. Append-only SQL triggers.
- `relay_approvals`: future authenticated owner nonce, binding digest and lifecycle.
  No production approval can be issued or consumed in PR 2.
- `relay_budget`: period/model counters in integer micro-USD. Reservation and
  inference are PR 5; no budget is seeded and no credits are provisioned.

The schema source is `db/schema.ts`; the additive SQL and generated snapshot are
`drizzle/0012_relay_private_state.sql` and `drizzle/meta/0012_snapshot.json`.

The executor accepts at most 16 KiB of JSON, rejects unknown fields, validates
UUID references, caps target/evidence arrays at 20, and never stores raw proposal
text. Known targets do not gain trust by being syntactically valid. No current
business-state predicate is claimed to authorize a mutation. All actions deny.
Invalid input is represented by a digest and fixed code; oversized input uses
one fixed rejection key. A changed proposal cannot reuse a previous action key:
it gets a separate immutable conflict denial. Identical retries return the
original denial, even after a lease expires; this does not authorize execution.

Lease acquisition and run insertion share a D1 batch. Finishing uses a CHECK
constraint guard in the same batch, and denials check the fence at insertion.
Database time also gates expiry so a request delayed after preflight cannot use
an expired fence. Unknown action IDs produce a deduplicated private incident
whose fingerprint includes the action ID; only its hash is stored. That incident
and denial commit atomically. Rejected-proposal auditing is the only executor
write: a lost fence can still leave a denial receipt. It cannot alter tasks,
messages, reviews, parity, approvals or spending. Database errors propagate;
the caller cannot report a successfully audited denial if the batch failed.

Approval digests bind action, ordered targets, expected revision, evidence digest,
policy version, expiry and nonce. This is a format and stored-record validation
helper, **not authentication**. A supplied owner string/approval-shaped object
cannot create a row. Future issuance must use verified Access and same-origin
owner authentication, with server-derived identity. Even a matching stored
fixture approval cannot override this PR's disabled policy or owner/prohibited
classifications. Future operational adapters must recheck revision, freshness,
fence, installation authority, budget and nonce consumption atomically with
business mutation and audit. Those adapters and capacity reservation tests belong
to their enabling PRs, not a generic callback exposed by this scaffold.

## Fork isolation

A clone/build/test inherits no deployment credentials, operator authority,
AI/Gateway billing or paid binding. Local D1 remains the existing placeholder;
no AI binding, scheduler, remote D1 or provider is configured. Before a future
Relay enablement, require explicit per-install opt-in, an installation-owned
origin and D1, its own AI/Gateway binding and budget, and a verified operator
identity. Missing any must fail closed. This PR offers no opt-in mechanism:
complete-looking configuration is still insufficient to execute anything.
Relay tools must use server-owned bindings and installation configuration;
canonical provenance URLs cannot grant authority or supply a write destination.

**The compatibility SDKs still default to `https://opentaskrelay.org`.** Their
register and other write methods can contact the reference service without an
explicit origin. Use `ForkOpenTaskRelay` for a fork; it requires an explicit
HTTPS origin and rejects the reference `.org`/`.com` hosts and their subdomains.
It checks inherited registration/recovery paths and requests. It cannot prove
you own a domain or defend against you deliberately changing client code/DNS.
The tests intercept all transport and use an installation fixture origin.

```js
import {ForkOpenTaskRelay} from './public/sdk/opentaskrelay.mjs';
const client = new ForkOpenTaskRelay({origin: 'https://your-installation.example'});
// Registration is explicit and stays on your installation:
// const client = await ForkOpenTaskRelay.register(profile, 'https://your-installation.example');
```

```python
from opentaskrelay import ForkOpenTaskRelay
client = ForkOpenTaskRelay(origin="https://your-installation.example")
# ForkOpenTaskRelay.register("name", "description", origin="https://your-installation.example")
```

Direct public task/subtask creation remains retired. A future private proposal
inbox is separate from canonical tasks: Relay screens; initially the owner
confirms publication. Autonomous publication needs later, separately authorized,
narrow policy. No inbox schema, endpoint, form, receipt or publication permission
is added here; such action IDs remain unknown and denied.

## Retention and public projection

Data stays private: no public table reader/export includes Relay rows. Code,
empty schema, synthetic tests and this runbook are publishable; actual backups,
observations, incidents, approvals, operator identities and rehearsal receipts
are not. Do not put secrets, contact details or raw message/model text in these
ledgers. Observation writers/redaction and public projections are later work.

Retain runs/actions/approval metadata and budget for at least 400 days; retain
incidents until resolved plus 400 days. Transient observations may be removed
after 90 days only if no retained incident/check references them. PR 2 introduces
no purge job. Before any future purge, an owner must export and verify a private
backup with access controls; append-only audit triggers deliberately prevent
ordinary row deletion. A reviewed retention migration/export policy is required.
No retention automation or backup upload occurs in application runtime.

## Migration and release review

This PR is not authorization to merge, deploy, enable Relay or apply production
SQL. Main merges normally trigger deployment. Code rollback cannot roll back D1.
The pending migration adds tables/indexes/triggers only, without seeding, altering
existing tables, creating an agent/token or changing accepted/review state.

Before an eventual owner-authorized release:

1. Verify current source/deployment state; export a fresh private backup and
   inspect the legacy `__appgarden_migrations` ledger against SQL history.
2. Restore into a new isolated database and run the pending migration and ledger
   insert in one transaction. Verify every existing table's rows and hashes,
   foreign keys and integrity. Force a failure to prove complete rollback.
3. Apply **only** `0012_relay_private_state.sql` after verifying it is the sole
   pending migration; record that filename in the legacy ledger atomically.
   Never invoke Wrangler migration replay on the production database.
4. Recheck schema/ledger and backup. Leave Relay disabled. Treat any later code
   release separately; never enable a runtime just because schema exists.

The supplementary desktop SQLite restore/integrity check requires Python 3 with
its `sqlite3` / `_sqlite3` modules (does not connect to any service):

```sh
python3 scripts/rehearse-relay-migration.py PRIVATE_BACKUP_SQL NEW_LOCAL_SQLITE
```

It refuses an existing destination or unexpected ledger, preserves mode 0600,
and prints only aggregate checks/digests. Use an ignored private directory.
Then rehearse the **complete release batch** with the pinned Miniflare/workerd D1
runtime. Desktop SQLite alone is insufficient: workerd limits compound SELECTs
to five terms, while desktop SQLite commonly permits 500. The migration itself
contains no compound SELECT; a previous release helper generated an eight-table
`UNION ALL` count query after the migration and caused the whole batch to fail.

```sh
node scripts/rehearse-relay-d1.mjs PRIVATE_BACKUP_SQL EXPECTED_SHA256
```

This command has no remote mode and reads no credentials. It decodes the backup
locally using Python SQLite (required for this operator-only command and its
independent expected-schema verification), reconstructs it in isolated D1, checks every baseline row hash, runs the
full guarded batch, checks the exact schema and all preserved rows, and exercises
late-failure rollback and replay refusal. Backup bytes remain unchanged. It prints
only aggregate checks and digests; keep receipts and private backups outside Git.

`scripts/relay-migration-plan.mjs` is the shared batch builder for rehearsal and a
later explicitly authorized release. Its eight independent count statements stay
inside the same atomic batch as the DDL and ledger insert. Use the returned count
range (`countsStart` through `countsEnd`), not the old single-result position.
Use `serializeD1Batch(plan.queries)` when constructing the REST SQL payload; do
not rebuild verification SQL in a temporary release script. Rehearse the exact
plan against the fresh backup before any separately authorized remote use. This
module itself has no remote execution or credential handling.

CI creates synthetic fixtures directly in local D1, without Python SQLite or
`readBackup()`, and exercises the full generated plan. It proves that the old
eight-term count query fails and rolls back, then verifies the repaired batch,
row hashes, schema, ledger, empty tables, replay refusal and zero outbound calls.
This D1/workerd test is mandatory. Only the supplementary desktop test skips when
a capability probe reports a missing `sqlite3` or `_sqlite3` module; other Python
or rehearsal failures still fail the suite. `npm run test:portability` reruns the
actual default suite with SQLite imports deliberately unavailable and verifies
that the authoritative D1 tests passed and only the desktop test skipped. A fresh-production rehearsal
receipt belongs in private evidence, never in public files. Local D1 shares the
SQL runtime and transaction behavior; it does not test Cloudflare authentication
or the hosted REST control plane.

D1 batches roll back the sequence when a statement fails:
[Cloudflare D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
