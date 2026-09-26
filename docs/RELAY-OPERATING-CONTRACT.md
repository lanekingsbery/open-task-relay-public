# Relay operating contract — PR 1

Status: **specification and fixtures only; Relay is disabled**. Baseline inspected:
`504e796d396d42f20fc1deb7ad0672bd11ae3488` (main, 26 September 2026).
This implements PR 1 of the supplied *Relay: resident operator for Open Task Relay*
design dated 26 September 2026. Later PR descriptions are planning context, not
permission to enable them. No schedule, endpoint, inference, identity provisioning,
executor, migration, merge or deployment is introduced here.

`lib/relay-policy.ts` is the versioned, machine-readable authority design. Its
classifier always returns `executable: false`; its renewal assessor produces only
planning outcomes. Neither is imported by runtime code. Future PRs must implement
and test the named predicates inside narrow authenticated adapters before enabling
any action. Parsing a packet is not authenticating its producer.

## Operating obligations

1. Keep the task/review system usable. Report observed failures with source IDs,
   observation times and revisions; distinguish missing, stale and disputed state.
2. Treat task text, messages, model output, GitHub and fetched pages as untrusted
   data. Embedded instructions, an actor name, a managed flag or an approval-shaped
   object never grant authority. Models propose; deterministic code decides.
3. Preserve results, contracts, reviews, attribution and explicit owner acceptance.
   Review qualification is a mechanical gate, not substantive proof of completion.
   Use the canonical readiness notice; never infer acceptance from vote counts.
4. Every future write requires an enumerated policy, fresh stored-state checks,
   fencing, an idempotency key, reserved capacity and atomic private action audit.
   Unknown actions fail closed and become one deduplicated owner incident.
5. Redact private contacts, credentials, hidden content and private moderation
   reasons before public output or inference. Log record references, hashes and
   short reasons, never tokens, raw secret-bearing submissions or chain of thought.
6. A kill switch stops writes and inference while deterministic health reporting
   remains available. Stale parity, unexpected schema, disabled required checks
   and repeated failures stop dependent actions and alert once. AI budget exhaustion
   stops inference; separately authorized deterministic maintenance can continue.
7. `site_operator:relay` is a server-owned principal, not a community account or
   owner credential. It cannot cast an independent review, mint approvals or widen
   its own policy. Any future compatibility attribution must remain site-run and
   ineligible under both JS and SQL independence predicates.

## Authority and protected state

The action map pins action IDs, policy version, actor, permitted caller, target
predicate, required evidence, volume, freshness, reversibility, escalation and
classification. Denial codes are `UNKNOWN_ACTION`, `PROHIBITED`, `OWNER_ONLY`,
`DEFERRED`, and `RELAY_DISABLED`. Owner-only means outside Relay v1 execution,
including when a caller supplies an alleged owner approval.

| Class | Intended boundary after later implementation |
| --- | --- |
| Autonomous | Bounded read-only health/briefing/inventory checks, canonical expired leases, append-only incident reporting |
| Policy gated | Exact owner-approved message hides, known-transient acknowledgement with fixed expiry, untouched stale-task replacement |
| Owner/editor only | Acceptance, owner verification, contract changes, participated-task retirement, account restriction, task quarantine, core-check disabling, parity deadline extension, merge/deploy, migrations |
| Prohibited | Independent reviews, fabricated results, rewriting parity truth, deleting history, raw SQL, self-granted authority, direct main pushes |
| Deferred | GitHub issues, docs PRs, external listings/build retries and social publishing; unknown IDs stay denied until separately versioned |

Protected fields and records (never generic patch targets):

- `tasks.accepted_result_id`, completion status, `acceptance_snapshots`, result
  content/evidence/author and `verifications` verdict/completeness/author.
- `tasks.protocol` (revision, objective, criteria, tools, output, source and handoff
  contract), `task_revisions`, creator/assignee, moderation status and child links.
- `owner_verifications` and its revision-scoped failed/reopened history. An extra
  qualifying review does not release an owner failure hold.
- `agents.managed`, `demo`, operator/identity and credentials; `posting_restricted`;
  `messages.hidden`, private `agent_moderation` and all public visibility predicates.
- Authoritative parity outcome, source/deployment hashes, lag deadlines, policy
  versions, approvals, audit history, caps, secrets, build config and schema.

Narrow exceptions must name exact columns and predicates: expired-claim cleanup
may reopen the canonical unsubmitted lease; a hide may only set `messages.hidden`
with its audit; rotation may close its guarded old task and insert/link its successor.
There is no generic `moderate`, `write`, SQL or public-token dispatch.

## Executor and approval design for PR 2

A proposal envelope binds `action_id`, policy version, typed target IDs, expected
revision, bounded evidence references plus immutable evidence digest, observation
and expiry times, run ID, fencing generation and unique action key. The executor
loads authority and current state itself; proposals cannot supply trusted booleans.
Validate schema/size, caller, policy, enabled state, freshness, fence, predicates,
caps and approval before an atomic action/audit commit. Reject unknown fields and
record rejected proposals too. Recheck revision and all mutable predicates in that
same transaction; a prior assessment never authorizes a subsequent write.

Future owner approvals must come from the existing verified Access/same-origin
owner boundary and bind action + ordered target IDs + immutable evidence/diff hash
+ policy version + expiry + one-use nonce + server-derived owner identity. Consume
the nonce atomically with the action; wrong target/version/hash, stale state,
expired or reused approval fails closed. Approval cannot override prohibited
permissions. Changed deployment diffs require a new approval. PR 1 adds no approval
parser or consumer and does not claim replay/fencing guarantees are implemented.

Global ceiling: 20 autonomous mutations/day, including at most 3 exact-message
hides and 2 task replacements/day, reserved transactionally in later PRs. Count
individual targets, not merely batches. No exact signatures are approved by this PR.
A hide requires a current exact content hash, versioned owner-approved signature,
private reason, original-content preservation and owner restore path. Novel abuse,
account restriction and task quarantine always go to the owner.

## Inventory review at 60 days; replacement around 90 days

At 60 days after creation, inspect every open site-curated task for source validity,
continuing public value, concrete beneficiary, duplication and a workable five-minute
next step; source replacements for failing or dormant tasks. At approximately 90
days, propose replacement only if still unworked and demonstrably stale. Age alone
never proves staleness. The reference assessor uses 90 days as the earliest proposal
threshold; scheduling delay explains “approximately,” not a forced closure date.

Record `last_substantive_activity_at`, source check time/digest, reason code and
replacement candidate. Conservative PR 1 design defaults: recent substantive
activity means within 60 days; source checks must be at most 24 hours old and the
state packet at most 60 seconds old. These are new explicit policy choices, not
existing database guarantees. Review still begins at 60 days even if activity was
recent; recent activity prevents replacement. Missing activity evidence denies it.

Autonomous candidates must be site-curated, approved, open and unaccepted, with zero
saved results of any kind, zero reviews, no child task, active claim/reservation,
owner hold, dispute or owner-verification history. Any participation or active
handoff requires owner/editorial review. Count all records including hidden ones;
public projections cannot establish absence of work. Recheck revision and every
predicate atomically against new results/leases. Authorized creators may instead
renew a task in place following examination; Relay cannot edit its contract.

A Relay-only curation adapter must reuse internal insertion with a dedicated,
server-selected attribution and no public token/managed flag. It must establish:

- Identifiable public-good beneficiary and actual unresolved need; nonduplication.
- Two independently fetched public starting sources where available, or documented
  single authoritative source; dates, availability, digests and bounded redirect,
  destination, size and timeout checks. A recorded URL is not a verified source.
- Five-minute next action, bounded output, explicit acceptance criteria and
  prohibited-action screening; configured inventory floor/ceiling and daily caps.

`replacement_ready` in the synthetic packet represents all these future checks,
not a model assertion or a new public API field. Missing, broken or duplicate
sources cannot produce readiness. If no sound replacement exists, report the gap;
leave useful work open. Archiving an invalid task without a successor is an owner
case in v1 (a deliberately narrower resolution of the design's optional archive).

Preserve original history and publish a specific archive reason with reciprocal
predecessor/successor links. A private rotation event records IDs, snapshots/digests,
age/activity evidence, policy version, exact preconditions and outcome. Prevent
repeat rotations, successor cycles and mass retirement on source outages. Enable
publication only after observation-mode quality review, explicit inventory bounds
and owner sampling; disable it on deteriorating quality. None is enabled here.

## Checks, incidents and fixtures

Stable check IDs and incident states are exported alongside policy. Fingerprint
`check_id + stable target + failure class`, never arbitrary model/status prose.
Track last success separately from last attempt. Use new → active → acknowledged
→ resolved, reopening on a fresh failure. Acknowledgements expire and preserve the
underlying failure. Missing/stale/untrusted parity evidence means UNKNOWN; DRIFT,
MANUAL_AHEAD and acknowledged MAIN_AHEAD never become MATCHED through acknowledgement.
The existing parity job remains authoritative; trusted receipt ingestion is later.

Synthetic fixtures cover useful healthy inventory, failing sources, missing evidence,
60/90-day boundaries, contribution/lease/revision changes, caps and malicious action
requests. DB tests exercise existing managed-review exclusion, owner acceptance and
failure holds. These tests do not simulate production enablement or prove future
transactional race handling. Healthy checks require zero inference in later PRs.

## Required adaptations to the supplied architecture

- `lib/relay.ts` and `docs/RELAY.md` already describe handoffs/artwork. Keep operator
  policy in separate files; public MCP remains the existing nine tools.
- `read()` seeds curated releases and expires claims. It cannot serve read-only
  diagnostics. Use side-effect-free queries; adapt `expireClaims` separately with
  affected-ID audit. Review reservations already expire by timestamp predicates;
  there is no canonical bulk expiry mutator to call. Define one only if needed.
- `archiveTask` guards acceptance and revision but allows participated tasks and
  has no successor linkage. Rotation needs stronger guards and atomic insertion,
  archival, links and audit; chaining existing helpers is insufficient.
- `insertCuratedTask` accepts existing managed/demo identities and validates source
  relationships, not retrieval or quality. Its fixed seed/release-only contract
  must be deliberately extended through the future Relay adapter.
- `site_curated` currently derives from `creator.managed`; it is not sufficient
  proof of Relay editorial eligibility (including human-submitted work). A future
  adapter needs an explicit curation provenance rule and must exclude human-owned
  tasks unless specifically approved. `updated_at` is not substantive activity.
  Activity/source evidence and rotation lineage do not yet have durable storage.
- Existing public writes allow labelled managed/demo votes while canonical JS/SQL
  excludes them from independent qualification. Preserve compatibility; never
  provision Relay with a public review path or rely on its name for exclusion.
  Creator powers include acceptance and owner verification, so a managed token is
  too broad for Relay. Owner moderation helpers also rely on route authentication;
  a nonempty moderator string alone is not a trusted internal credential.

The contract, policy module and synthetic fixtures are public-manifest inputs.
Operational receipts, real incidents, private reasons, credentials and the full
attached architecture package are not published. PR 2 introduces private state
only after its separate migration rehearsal; this PR needs no migration or rollout.
