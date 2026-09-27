# Relay PR 4: scheduled shadow mode

> Historical engineering record. Statements about disabled features, planned stages, navigation and release gates describe this earlier stage, not the current service. See [Relay](RELAY.md), [Meet Relay](MEET-RELAY.md) and [Operator v2](RELAY-OPERATOR-V2.md) for shipped v1.8 behavior. Original evidence is retained below.

This PR adds an hourly production Cron adapter for the existing denial-only shadow
runner. Creating this PR does not install a schedule or change production. Release
requires a separate merge/deploy decision. No migration or credentials are needed.
The deployed schema and all action-denial policies remain unchanged.

## Wake and source identity

The private production configuration generates `0 * * * *` (hourly at minute zero,
UTC), `RELAY_SHADOW_ENABLED=true`, and a deployment-bound
`RELAY_SHADOW_SOURCE_VERSION`. The latter must match the clean checkout,
`WORKERS_CI_COMMIT_SHA`, and the build receipt. The receipt hashes the built server
and client files; missing, dirty, mismatched or changed artifacts prevent production
configuration. The receipt itself is outside deployed assets and source archives.
Gitless or dirty local source can still build, but cannot create production config.

The Worker awaits exactly one `scheduledRelayShadow()` call per event. Cloudflare's
[scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
waits for the returned promise. No HTTP wake route, queue, alarm, recursive timer,
catch-up loop or application retry loop is introduced. The event must contain the
exact Cron string and a positive safe-integer timestamp no later than now and less
than one hour old; future, malformed and old events fail before D1 access. Seconds
and milliseconds past the hour are accepted. Freshness uses the supplied timestamp,
including when delivery crosses an hour boundary. Missed hours are skipped.

For identity only, the supplied timestamp is floored to its UTC hour. A SHA-256
namespace/cron/normalized-timestamp digest supplies a stable UUIDv8 wake ID, preserving
existing exact-hour IDs. It is
unique per hourly slot, and deliberately independent of the deployed source SHA.
Duplicate delivery uses the same wake; a source change during redelivery cannot
create another successful observation for that hour. Every acquired run records
`trigger=scheduled_shadow` and the full source commit SHA. The build SHA comes from
[Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
not a caller-controlled request parameter.

## Boundaries, overlap and failure

Both `RELAY_SELF_HOSTED=true` and `RELAY_SHADOW_ENABLED=true` are required.
`MIGRATION_FREEZE=true` suppresses the wake. A compiled staging origin also suppresses
it. Local and public-fork configuration has neither a Cron trigger nor opt-in;
even direct scheduled dispatch with default bindings cannot access D1.

The existing [shadow runner](RELAY-SHADOW-MODE.md) remains authoritative: a
30-second deadline, one 60-second fenced maintenance lease, at most 25 sampled
rows, one candidate, one observation and at most one denied proposal. It uses
metadata SELECTs instead of request handlers that may seed tasks or expire claims.
No action adapter or network/provider capability is passed to it.

An active lease returns `LEASE_BUSY` and the slot is skipped unless redelivered.
Expired leases are recovered with a new generation. Duplicate successful wakes
return `REPLAYED`; a source conflict fails the event. Audit failure rolls back the
observation/proposal/check-state transaction and releases only the owned lease.
Failed attempts can retry the same wake within the freshness window under a fresh fence;
otherwise the next hourly wake recovers expired work. There is no guarantee of
platform redelivery, and no catch-up for a missed observation.

Errors fail the scheduled event with a fixed message; private structured logs
contain only a fixed outcome code and `executable=false`. Raw exceptions, SQL,
bindings, task text, tokens and identities are never logged by the adapter. Successful
observations and denial audits remain in the private Relay tables. No public API,
page, activity feed, MCP tool, source archive or operator export includes these
records. `PROPOSED` still means a private denial audit, never action permission.

To pause shadow wakes after a separately authorized release, set the private
`RELAY_SHADOW_ENABLED` variable to `false` and remove the Cron trigger if desired.
The release config explicitly sets it back to `true`; a subsequent deployment
must therefore be reviewed before resuming. No wake is performed in this PR.

## Verification

Synthetic SQLite and local workerd/D1 tests exercise duplicate simultaneous wakes,
active-lease overlap, stale-lease recovery, old-fence denial, audit rollback, retry,
source conflicts, deadline expiry, invalid events and disabled/frozen installs.
The built Worker receives real scheduled dispatches; HTTP cannot wake Relay or
read its records. Canonical tables are compared before/after, outbound transport
is intercepted, and approvals/budgets/provider/model fields remain unused. The
production Wrangler dry-run checks hourly configuration and unchanged service
bindings; build-provenance tests reject stale output and dirty/mismatched sources.
Existing invalid/unauthorized proposal and publication tests remain in the suite.

Still disabled: AI/model calls and spending, external fetching/writes, task
claims/creation/acceptance, review submission, public posting, approvals, action
adapters, all operational action authority and public Relay state. Production
remains dormant until a separately authorized release installs this schedule.

Relay can wake autonomously, but cannot act.
