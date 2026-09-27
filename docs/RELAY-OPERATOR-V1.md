# Relay Operator Mode v1

This version extends the scheduled shadow baseline with explicitly bounded,
deterministic authority. It has no inference binding or provider integration.
The generic proposal executor and its original denial-only audit remain disabled.
Only the compiled scheduled adapter can invoke routine execution. Public task
creation through REST, MCP and A2A remains retired.

## Production authority

Hourly wakes check the favicon through the existing ASSETS binding, inspect D1
metadata, counts capped at 25 for open tasks and the canonical first-review queue,
and a sample of 25 pending requests, then record a health observation.
This checks local application dependencies, not DNS, edge routing, external source
availability, substantive task quality, or private/public source parity. The
independent release parity checker remains authoritative.

At most three actions per wake and 20 per UTC day can:

- Reopen one expired approved claim with no saved results and no acceptance.
  Recheck the exact lease, status, assignee, protocol and update timestamp in the
  commit. Only status, assignee, claim expiry and update time change. Preserve the
  canonical claim-expired event and an immutable before/after receipt.
- Flag one approved open task aged at least 60 days for owner review, creating a
  deduplicated private incident and follow-up. Age never retires or changes a task.
- Flag an unavailable static dependency or a request awaiting review for seven
  days. Existing open follow-ups deduplicate alerts. The owner resolves them.

The 30-second SQL deadline, existing maintenance lease/fencing generation, durable
kill switch, daily capacity and receipts are checked inside one D1 batch. An audit
failure rolls back the entire action batch. A completed hourly wake cannot execute
again, including after a deployment. Failed attempts expire their lease and a
future wake can recover; there is no catch-up or retry loop. Health telemetry is
one observation per completed hourly wake and is separate from the 20-action cap.
Static failure suppresses lease expiry. D1 failure emits a fixed scheduled failure
code; a database outage cannot reliably write an incident into that same database.

## Request inbox and owner decisions

`/task-requests` is the human form. Agents POST JSON to `/api/task-requests` with a
random 256-bit hexadecimal `request_key`, title, objective, beneficiary,
next_action, expected_output, acceptance_criteria, public HTTPS sources, category,
and intent (`public_good_research`). There is no identity creation or public task
write. Store the key privately; the server stores its hash. GET with `X-Request-Key`
returns only that request's status, reason, eventual public task ID and resubmission
instructions. The original request and drafts are owner-only.

The inbox accepts at most 3 requests per IP per UTC day, 40 globally per day and
2,000 retained requests total. Quotas and the request/audit insert share a D1
transaction. Identical retries reuse the same receipt without another quota charge;
a changed payload under the same key conflicts. Raw IPs are not stored. Input
bodies are limited to 32 KiB, individual fields to 2,000 characters, source and
criteria arrays to five, and persisted request content to 16,000 characters. Known
credential patterns are rejected by the existing body parser. Detection is not
proof that content contains no private information.

Deterministic DENY applies only to the filled hidden spam field and explicit
promotion/transaction intent. It records a reason and allows corrected resubmission
with a fresh key. Other content, including scams, inappropriate or off-mission
requests that need semantic judgment, remains HOLD. No keyword classifier asserts
legitimacy. Every syntactically valid request receives a normalized draft candidate;
HOLD candidates are not publication-ready until the owner reviews them. No request
text is executed, fetched, interpreted as instructions, or sent to a model.

At `/moderation/relay`, Cloudflare Access verifies the configured owner. POST also
requires exact same-origin. The owner checks sources, benefit, duplication and
scope, edits the full contract and prepares a reviewed DRAFT. A separate explicit
publication confirmation binds the saved draft hash and request revision. Publication,
request transition, event and immutable receipt commit atomically using an existing
site curator. Changed/replayed approvals cannot create another task. Site-run
attribution remains excluded from independent review. There is no autonomous
publication, review, acceptance, account restriction, task quarantine, trust change,
credential management, external posting, merge or deployment adapter.

## Kill switch, rollback and costs

The owner pause button updates `relay_operator_control` with compare-and-swap and
an immutable receipt. Every new autonomous or request/publication commit checks it
inside the same transaction. In-flight batches serialize before or after the pause;
none can commit through a stored disabled switch. Paused wakes return PAUSED without
writes; static dependency checks and owner read-only health remain available.
Owner control, follow-up resolution and narrowly guarded restoration remain possible.
The Worker also requires both self-hosted opt-in and `RELAY_OPERATOR_ENABLED=true`;
public forks, staging schedules, or migration freeze cannot gain reference authority.
Redeployment does not overwrite the durable pause state.

An owner can restore an exact recorded pre-expiry lease only while the reopened task
is untouched and still has no result or acceptance. The original expired timestamp
remains expired; this is an audit-preserving rollback, not a lease extension. Existing
canonical reads may reopen it again. The scheduled executor never reapplies an
already receipted lease expiry. Rollback to the previous Worker leaves the additive
0013 tables unused; do not drop them or reverse history. Disable v1 before rollback.

Incremental inference cost and calls are exactly zero. No paid plan, AI binding,
new secret or uncapped billing is enabled. Compute/storage use the existing Worker,
D1 and hourly schedule. The caps bound accepted work, not all abusive HTTP traffic;
existing platform limits still apply. Daily request and action caps do not authorize
paid overages. Capacity exhaustion fails closed. Raising limits or adding semantic
inference requires another reviewed release with verifiable allowance controls.

## Release verification

0013 adds four tables, five indexes, two append-only triggers and one control row;
existing schema objects and rows remain unchanged. Apply only the exact guarded
migration plan after fresh backup and isolated D1 rehearsal, including late failure
rollback, unchanged old history, exact ledger 13 to 14, repeat refusal, foreign keys
and quick check. Keep actual backups and receipts outside public source.

The 0012 historical tests remain pinned to their original migration boundary; 0013
has a separate required regression. The old blanket prohibition on HTTP imports of
Relay types is replaced only for the narrow operator API; tests still reject HTTP
imports of runRelayShadow, runRelayOperator, evaluateRelayProposal or acquireRelayRun.
Authorization, abuse, prompt injection, idempotency, concurrent limits, stale fencing,
rollback, no-inference budget, deadline and kill-switch checks run against local D1.
Production verification uses read-only metadata/static paths and never synthetic
public submissions. Record exact private/public commits, PRs, deployment and archive
hashes; source parity does not independently establish deployment configuration.
