# Relay PR 3: shadow mode

Status: dormant implementation for review. Relay is still disabled. No migration,
route, Cron, Worker import, model binding, credentials or installation opt-in is
added. `runRelayShadow(db, {wake_id, source_version})` is an internal manual-wake
function exercised against synthetic local databases, not a production endpoint.
The existing deployed 0012 schema and denial-only SQL constraint are unchanged.

## Architecture and authority

A wake has a caller-generated UUID retained across retries and an exact source
commit SHA. The runner obtains the existing 60-second maintenance lease with a
fresh run UUID and increasing fencing generation. Acquisition atomically expires
the previous abandoned run. An active lease returns `LEASE_BUSY` without creating
another run. No renewal or autonomous retry loop exists.

The invocation has a 30-second deadline. It samples the first 25 open, approved,
unaccepted tasks in row order, then selects at most one non-demo managed-creator
task aged at least 60 days with a valid revision. This is a bounded sample, not a
complete inventory scan or fairness guarantee. Managed attribution is sufficient
only for this private inventory observation; it does not establish editorial
provenance or eligibility to retire, replace, accept or publish a task.

The reader uses direct SELECTs, never `commons.read()` (which seeds tasks and
expires claims). Only a UUID, numeric revision and creation timestamp leave the
query. Task text, protocol instructions, identities, credentials, private contact
fields and moderation reasons cannot enter evaluation. No source URL is fetched.

The fixed `deterministic-v1` evaluator emits `REVIEW_DUE`, or `NO_CANDIDATE` for
an empty/ineligible sample. Its observation explicitly records source checks as
`NOT_PERFORMED` and editorial eligibility as `NOT_ESTABLISHED`. It never concludes
that a task is stale or replacement-ready. There is no plugin/provider callback.

A strict proposal envelope binds the task revision, observation, evidence hash,
run, generation and expiry. The additional shadow validator accepts only the
inventory-review shape and rejects extra fields, authority/approval claims,
staleness and other actions. The existing denial-only executor remains available
for auditing invalid/unauthorized envelopes and rejects every action. Even a valid
shadow proposal is recorded as `outcome=denied`, `error_code=RELAY_DISABLED`.
`PROPOSED` means that a private record was saved; `executable` is always false.

## Atomicity, replay and failure

One D1 batch contains the live fence/deadline CHECK guard, observation, optional
denial audit, check-state success, run completion and lease release. A failure
rolls the whole batch back. No business-state mutation is included. The shared
`mutation_guards` table is only a transient transaction assertion and is empty
after commit or rollback. This uses [D1 batch rollback semantics](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

The observation primary key stores the wake UUID. Its action key is
`shadow:<wake UUID>`. A committed retry returns `REPLAYED`; a changed source SHA
with the same UUID returns `IDEMPOTENCY_CONFLICT`. Neither creates another
observation or audit. An acquisition-time replay race is rechecked before reading
tasks. A different wake UUID is a new observation, even for the same candidate.
A failed attempt leaves no observation, so the same wake can retry with a fresh
fence. A changed task after observation does not authorize action: the recorded
revision is a historical snapshot, not current-state permission.

Failures return/persist fixed codes only; SQL/validation/exception text is never
logged or returned. Best-effort cleanup marks only the still-owned run failed and
releases only its lease. If D1 is unavailable or a fence is lost, cleanup cannot
claim success: the abandoned lease expires and a later acquisition recovers it.
Check-state success advances only with a committed observation.

The caller receives `SHADOW_TIMEOUT` at the deadline. D1 promises cannot be
cancelled; a timeout latch prevents subsequent work after a delayed read resumes,
and database time rejects a delayed final batch. An already committed transaction
can outlive a delayed response; replaying its wake retrieves the durable receipt.
There is no claim that JavaScript can forcibly cancel in-flight D1 I/O.

## Boundaries and validation

Tests run against Node SQLite and local workerd/D1 using the existing migrations.
They cover overlapping wakes, lease takeover at commit, expired-run recovery,
private proposal recording, invalid/unauthorized proposals, idempotent replay,
source conflicts, late audit rollback, retry, timeout continuation, bounded empty
samples and redaction. Canonical tables are compared before/after, transport is
intercepted, and built/runtime import boundaries are checked. Existing built-Worker
and publication/security tests continue to enforce no public Relay interface.
Only generic source, this contract and synthetic tests enter the public source
manifest; runtime records are never an export input.

Still disabled: all task claims/creation/acceptance, reviews, public posting,
external writes, source fetching, production wakes, scheduler/routes, AI/provider
calls and spending, approval issuance/consumption, operational actions, and public
Relay state. No merge, deployment, production SQL or enablement is part of this PR.

Relay can observe and propose, but cannot act.
