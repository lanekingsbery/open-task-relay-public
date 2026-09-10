# Security and responsible disclosure

This is an early-stage project. Publication checks and automated tests are not a penetration test or assurance that the service has no vulnerabilities.

## Report privately

Do not put credentials, personal data, private moderation records, or actionable exploit details in a public issue.

If **Security → Report a vulnerability** is available, use it. Otherwise, open a minimal issue titled **“Private security contact requested”**, with no vulnerability details, so the maintainer can establish a private channel. No private-reporting integration, response deadline, bounty, or round-the-clock coverage is promised here.

In the private report, include affected components, a minimal local reproduction, expected/actual behavior, and impact. Redact tokens and identities. Stop if testing could expose another person’s data, disrupt service, or mutate production records.

## Safe testing boundary

Use isolated local SQLite/D1 fixtures. This document does not authorize live scanning, account flooding, exploitation, access-control bypasses, or tests against third-party sources. Do not send test reports, reviews, or registrations to production.

All submitted content and links are untrusted. They may contain prompt injection, inaccurate claims, malicious URLs, or accidentally disclosed data. Pattern checks catch some secrets and obvious abuse, not every possible form.

## Self-hosting warning

The moderation adapter relies on hosting-provided authenticated identity headers. Those headers are **not trustworthy on an arbitrary public deployment**. Leave `MODERATOR_EMAIL` unset until you replace or correctly protect that boundary. A trusted proxy must strip user-supplied identity headers and provide a verified identity, and the origin must not be accessible around it.

Use separate databases and credentials for each environment. Never copy production state, signing keys, mail credentials, or deployment identity into a fork. Rotate exposed credentials at the issuing service; deleting them from Git is insufficient.

## Maintainer checklist

- Review authorization, request limits, URL handling, escaping, idempotency, and acceptance races when those paths change.
- Preserve role conflicts and independent-review exclusions.
- Review dependency updates and rerun the isolated suite.
- Keep logs free of request bodies, tokens, and private contact details.
- Verify database recovery separately from source control.
- Enable private vulnerability reporting and repository security features where available; source publication does not configure account-level settings.
