# Security policy

İMKÂN is a public demonstration deployment. It is not a production service for
schools and must not receive real student data, personal data or real passwords.

## Reporting a vulnerability

Email **node42.team@gmail.com**. A machine-readable contact is published at
[`/.well-known/security.txt`](public/.well-known/security.txt).

Please do not open a public issue for a suspected vulnerability, and never
include credentials, personal data or exploit details in one.

## What the deployment does

- Provider-backed generation is enabled when `APP_MODE=live` and an API key is
  present. The key is injected from AWS Secrets Manager, never from a plain
  environment variable in source control.
- The model receives the workshop topic and the resource profile. It has no
  tools, no filesystem access and no database access, and only ever writes the
  session's prose. Stage counts, durations, material quantities, cost, route
  eligibility and the budget guard are recomputed server-side.
- Provenance is server-attested. A draft references a generation record the
  server issued, scoped to the requesting user and bound to a hash of the
  profile; prose supplied by a client is rejected outright, and a record built
  by an earlier version of the generator is refused rather than persisted
  against rules it was not built under.
- Accounts, reviews, publication and session feedback are persisted in
  PostgreSQL. Passwords use Argon2id and sessions are opaque, server-side and
  revocable.
- Registration creates a pending account with no role and no session until a
  manager activates it.

## Known boundaries of the demo

- TLS terminates at CloudFront. The edge-to-load-balancer hop inside AWS is
  plain HTTP until an owned domain allows a certificate on the load balancer.
  The load balancer accepts traffic only from CloudFront origin ranges, so the
  application is not reachable in cleartext from the internet.
- The session generation, review and publication areas require a session and
  are excluded from crawling.
