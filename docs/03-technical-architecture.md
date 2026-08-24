# Technical Architecture

## System shape

Use a TypeScript modular monolith in one repository and one Docker image.
Deploy a long-running Node runtime with PostgreSQL. The web server and
database-backed generation worker share the same domain code.

```text
Next.js web/PWA
  -> authenticated route handlers and server actions
  -> TypeScript domain modules
  -> PostgreSQL state, queue and audit records
  -> generation worker
  -> structured-output LLM provider
  -> deterministic validation and assembly
  -> pedagogical review
  -> print/SVG delivery
```

## Technology decisions

| Layer | Decision |
|---|---|
| Frontend | Current-stable Next.js App Router, React and TypeScript |
| Styling | Repository-owned responsive CSS and accessible React components |
| Backend | Next.js route handlers plus pure TypeScript domain modules |
| Database | PostgreSQL |
| ORM | Drizzle with committed SQL migrations |
| Static validation | Zod |
| Dynamic template validation | Zod in P0; JSON Schema/Ajv when authored templates become dynamic |
| Authentication | Database-backed sessions and Argon2id password hashes |
| AI | One P0 provider behind a small `LLMProvider` interface |
| Work queue | PostgreSQL rows claimed with leases |
| Progress | Durable events; polling first, SSE enhancement |
| Export | HTML print CSS and deterministic React/SVG game layouts |
| Logging | Structured application logs and provider-call metrics |

## Deliberate P0 exclusions

- No Redis
- No vector database
- No object storage
- No multi-tenancy
- No user document uploads
- No independent microservices
- No unrestricted tools in the model loop
- No second AI reviewer model
- No automatic email notifications
- No export format beyond print/PDF

## Module boundaries

```text
curriculum -> authoring -> review -> delivery
```

- `curriculum` owns objectives, pedagogy models and approved templates.
- `authoring` owns requests, generation runs, stages and assembly.
- `review` owns versions, change requests and approval.
- `delivery` exposes only approved packages, print views and feedback.

Modules may depend only toward the right. Delivery must never read an
unapproved draft as if it were published.

## Suggested folder structure

```text
app/
  (dashboard)/
  request/new/
  runs/[id]/
  workshops/[versionId]/
  print/[versionId]/
  api/

server/
  auth/
  db/
    schema.ts
    client.ts
    migrations/
  domain/
    objectives.ts
    templates.ts
    requests.ts
    runs.ts
    assembly.ts
    validation.ts
    review.ts
    delivery.ts
  llm/
    provider.ts
    providers/live.ts
    providers/replay.ts
    prompts/
    schemas/
  worker/
    loop.ts
    leases.ts
    reaper.ts
  events/
    generation-events.ts

components/
games/
seed/
tests/
```

## Runtime topology

The same Docker image contains the web and worker entry points. P0 may run both
inside one deployment as long as:

- The worker uses asynchronous polling with backoff.
- Provider calls never block the web event loop.
- Worker concurrency is globally capped.
- The container exits if either critical runtime process crashes.
- Only one worker replica is initially enabled.

Later deployments may run web and worker as separate services from the same
image without changing domain code.

## Progress events

Store every progress change in `generation_events` with a per-run monotonic
sequence number.

Example events:

```text
RUN_QUEUED
OBJECTIVE_PINNED
CANDIDATES_FILTERED
STAGE_LEASED
STAGE_GENERATED
VALIDATION_WARNING
REPAIR_STARTED
STAGE_COMPLETED
WORKSHOP_ASSEMBLED
READY_FOR_REVIEW
```

Polling uses `GET /api/runs/:id/events?after=<sequence>`. SSE uses the same
event rows and cursor, so it does not create a second source of truth.

## Generation and review states

### Run

```text
queued
  -> running
      -> ready_for_review
      -> completed_with_warnings
      -> needs_manual_fix
      -> failed
      -> budget_exceeded
  -> cancelled
```

### Stage

```text
pending
  -> leased
  -> generated
  -> validating
      -> repairing
      -> complete
      -> failed
```

### Workshop version

```text
draft
  -> submitted
      -> changes_requested
      -> approved
          -> published
          -> superseded
```

## Queue correctness

`FOR UPDATE SKIP LOCKED` prevents simultaneous claims but does not recover work
after a worker crash. Every claimed stage therefore records:

- `claimedBy`
- `claimedAt`
- `leaseExpiresAt`
- `attemptCount`

A reaper returns expired leases to `pending`. A stage that has exhausted its
provider retry and one semantic repair becomes terminally failed.

Assembly has a dependency barrier: it may start only when every required stage
is complete.

## Idempotency and concurrency

- `POST /api/runs` requires an idempotency key.
- The unique key is scoped to the requesting user in P0.
- Provider retry counters are updated under the stage claim guard.
- Approval uses optimistic concurrency; a stale review cannot overwrite a
  newer version or decision.
- Objective and template versions are pinned once at run creation.
- Demo mode is selected once per run and cannot switch mid-run.
