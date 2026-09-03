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
- The model receives the learning objective and the resource profile. It has no
  tools, no filesystem access and no database access, and only ever writes the
  workshop's prose. Stage counts, durations, material quantities, cost and the
  budget guard are recomputed server-side.
- Accounts, reviews, publication and classroom feedback are persisted in
  PostgreSQL. Passwords use Argon2id and sessions are opaque, server-side and
  revocable.
- Registration creates a pending account with no role and no session until a
  manager activates it.

## Known boundaries of the demo

- TLS terminates at CloudFront. The edge-to-load-balancer hop inside AWS is
  plain HTTP until an owned domain allows a certificate on the load balancer.
  The load balancer accepts traffic only from CloudFront origin ranges, so the
  application is not reachable in cleartext from the internet.
- The workshop generation, review and publication areas require a session and
  are excluded from crawling.
