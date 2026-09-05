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
content -> authoring -> review -> delivery -> library -> adaptation
```

- `content` owns the published Bilim Türkiye catalogue, topics, formats,
  materials and centres. Static research lives here; operational centre data
  lives in the database beside it.
- `authoring` owns requests, generation runs, route candidates and assembly.
- `review` owns versions, change requests and approval.
- `delivery` owns delivery records, their frozen plan snapshots, observations
  and report versions. It exposes only published packages.
- `library` owns published entries, their filters and their visibility.
- `adaptation` reads a library entry and writes a new draft. It never writes to
  anything upstream of it.

Modules may depend only toward the right. Delivery must never read an
unapproved draft as if it were published, and adaptation must never modify the
source it came from.

Two cycles were broken deliberately: costing lives in its own module so
`generator` and `candidates` do not import each other's values, and the
compatibility preview is separate from the adaptation action so a page can show
the comparison without creating anything.

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

### Delivery report

Deliberately the same shape, so a reviewer learns one set of rules:

```text
draft
  -> submitted
      -> changes_requested
      -> approved
          -> published        (visible in the activity library)
          -> superseded
```

An approved report is never edited. A correction supersedes it with a new
version, so what a pedagogue signed stays readable exactly as they signed it.
Publication is a separate decision from approval and is held by the manager:
approval says the account is accurate, publication says it may be shared — and
it requires the educator to have granted permission.

## Facility status

A centre facility carries three states, and every consumer must handle the
third:

```text
available     published or verified present
unavailable   verified absent by a person who checked
unknown       nobody has established either way (the default)
```

Research data may only ever produce `available` or `unknown`. A route needing
an `unknown` facility is reported uncertain, never rejected. Route selection
passes over an uncertain route for delivery but keeps it on the plan with what
would have to be checked.

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
