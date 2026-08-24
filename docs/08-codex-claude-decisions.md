# Codex–Claude decision record

This record captures material outcomes from the read-only Claude consultations.
Codex remained the implementation owner and final decision-maker throughout.

## Adopted findings

- A new public registration creates a `pending` account without a session. A
  manager must assign one of the four product roles before the user can sign in.
- Pedagogical approval and managerial publication are separate transitions.
- Requested changes create a new version and supersede, rather than overwrite,
  the reviewed version.
- Workflow transitions are audited, sessions are revocable, request bodies are
  bounded, and generation writes use body-bound idempotency keys.
- The replay generator has stable metadata, the health endpoint checks the
  database, and password hashing has bounded concurrency to protect availability.

## Deliberate disagreements and scope choices

### One role per account for P0

Claude proposed a `user_roles` join table to support multiple simultaneous roles.
The Creathon workflow defines four exclusive personas, so P0 keeps one nullable
role on each account and records who assigned it and when. A join table remains a
straightforward migration if a real deployment later requires multi-role users.

### Replay generation before a live provider

Claude correctly identified that a queued model worker, live provider adapter,
and durable event stream are needed for production-scale generation. They remain
P1: the public demo intentionally uses deterministic replay content so judges can
exercise the complete human review and publication workflow without provider
latency, cost, or nondeterministic failures.

### Relational database for the public demo

Once public accounts and immutable review transitions were added, local-only
state was no longer sufficient. The implementation therefore uses PostgreSQL on
AWS and PGlite for isolated development and browser tests; the AWS target is ECS
Fargate with private RDS rather than a stateless App Runner-only deployment.

## Final verification note

The initial adversarial consultation completed and informed the changes above.
A final read-only Claude release pass was attempted twice on 24 August 2026; the
first process stalled without returning a verdict and the replacement could not
start because the Claude account reached its session limit. Codex completed the
release review and the full automated verification suite; no Claude-generated
edits were accepted or applied.
