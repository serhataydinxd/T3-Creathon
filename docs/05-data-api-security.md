# Data, API and Security

## Relational model

The tables below are the ones that exist. `server/db/schema.ts` is the source
of truth; this section is a map, not a specification.

### Identity

- `users` — id, email, password hash, name, role, status, timestamps
- `sessions` — opaque, server-side, revocable

### Content identity

- `topics` — a Bilim Türkiye workshop topic: theme, cohort, title, and either
  the catalogue entry id it mirrors or an `imkan:` slug when the catalogue
  lists no counterpart. This is the product's identity.
- `objectives` — official MEB learning outcomes. Rows created before topics
  existed are marked `legacy_catalogue_topic` and are never treated as
  outcomes; they survive only because saved runs reference them.
- `topic_outcome_mappings` — the optional claim that a topic maps onto an
  outcome, with its own `verified` flag, verifier and date. A mapping is a
  claim about a pair, not part of either one's identity.

### Centres

- `centres` — operational rows seeded from the static research file
- `centre_capabilities` — one facility at one centre: status (available /
  unavailable / unknown), source URL, verifier, verification date, note
- `centre_inventory` — standing stock per centre, same status vocabulary

The sync never overwrites a row a person verified: a deploy re-asserting the
published claim would silently expire an educator's finding.

### Generation and review

- `generation_runs` — `topic_id` and a nullable `objective_id` (a catalogue
  topic legitimately has no outcome), request, objective snapshot, mode
- `generation_records` — a server-issued plan, scoped to the requesting user
  and bound to a hash of the profile, so a draft can name a generation without
  ever sending prose back up
- `generation_stages`, `workshop_versions`, `version_transitions`, `reviews`
- `educator_feedback`

### Delivery and reporting

- `delivery_records` — the immutable `plan_snapshot` taken when a delivery
  starts, plus actual participants, groups, minutes, cost, observations,
  incident flag and sharing visibility. Planned figures live in the snapshot
  and actual ones in their own columns; the two never share a field.
- `delivery_stages` — per stage: applied / modified / skipped, the reason, and
  what was actually observed
- `delivery_materials` — planned quantity beside actual quantity and any
  substitute
- `delivery_reports` — immutable narrative versions with status, mode and
  provider model
- `report_transitions` — the audit trail

### Sharing and reuse

- `library_entries` — denormalised published entries. Carries what the library
  filters on and deliberately omits safety observations, incident detail,
  free-text accessibility notes and the educator's name.
- `adaptation_records` — source version, source entry, target centre, who
  adapted it, and the computed compatibility at the time

## API routes

```text
POST   /api/runs
GET    /api/runs/:id
POST   /api/runs/:id/cancel
GET    /api/runs/:id/events

GET    /api/objectives
POST   /api/objectives
POST   /api/objectives/:id/submit
POST   /api/objectives/:id/approve

GET    /api/templates
POST   /api/templates
POST   /api/templates/:id/submit
POST   /api/templates/:id/approve

GET    /api/workshops/:versionId
POST   /api/workshops/:versionId/request-changes
POST   /api/workshops/:versionId/approve
GET    /api/workshops/:versionId/print
POST   /api/workshops/:versionId/feedback

GET    /api/manager/overview
POST   /api/manager/users
PATCH  /api/manager/users/:id
```

Route handlers must remain thin: authenticate, authorize, validate, call a
domain function and convert its result to an HTTP response.

## RBAC

| Action | Content expert | Pedagogue | Educator | Manager |
|---|---:|---:|---:|---:|
| Author objective/template | Yes | No | No | No |
| Approve objective/template | No | Yes | No | No |
| Generate workshop | Yes | Optional | No | No |
| Edit draft | Yes | Yes | No | No |
| Approve workshop | No | Yes | No | No |
| View approved package | Yes | Yes | Yes | Yes |
| Submit classroom feedback | No | No | Yes | No |
| Verify a centre facility | No | No | Yes | Yes |
| Start a delivery record | No | No | Yes | Yes |
| Record what happened | No | No | Own | All |
| Draft/edit a report | No | No | Own | All |
| Approve a report | No | Yes | No | Yes |
| Publish a report to the library | No | No | No | Yes |
| Adapt a library entry | Yes | No | Yes | Yes |
| View operational overview | Own | All reviews | Published | All |
| Manage users | No | No | No | Yes |

The artifact author cannot approve that same artifact. That extends to reports:
an educator cannot pedagogically approve their own account of their own
session, and neither can whoever drafted the text.

Facility verification is limited to educators and managers because those are
the roles that are actually in the building. A content expert writing a session
in another city is not in a position to assert what a centre has.

Publication to the library requires the educator's sharing permission. A
manager may publish, but only what its author agreed could leave the centre.

## Threat model and controls

### Prompt injection

- Do not accept arbitrary document uploads in P0.
- Length-limit free-text classroom context.
- Mark user text as untrusted data in the prompt.
- Validate every referenced ID server-side.
- Give the model no tools or side effects.

### Disclosure through the library

- A library entry is a public document. Safety observations, incident detail,
  free-text accessibility notes and the educator's name are never copied into
  one.
- The report narrative keeps safety in its own section, and the library renders
  an allow-list of sections rather than filtering that one out — so a section
  added later is private until someone decides otherwise.
- This was a real defect before it was a rule: the safety note reached the
  public entry through the narrative while the denormalised columns were
  correctly stripped.
- Library queries filter, sort and paginate in the database; unpublished rows
  never reach the client, not even as ids.

### Adaptation

- An adaptation reads its source and writes only a new draft. The source
  version, its delivery record and its report are never modified.
- The topic is taken from the source snapshot, not from the request: changing
  it would make the result a different workshop rather than an adaptation.
- Target facility statuses are read from the operational centre record on the
  server. A caller cannot assert that their centre has a planetarium.

### Unsafe activities

- Use only approved activity templates.
- Validate grade-specific parameter bounds in code.
- Make safety independent of budget flexibility.
- Require pedagogical approval before publication.

### Authorization

- Authenticate every non-public route.
- Authorize the action and resource state at the route boundary.
- Block self-approval.
- Use optimistic concurrency for review decisions.
- Never expose drafts through educator delivery queries.

### XSS and artifact injection

- Render generated values only as escaped React text/props.
- Never use `dangerouslySetInnerHTML` for model output.
- Let code own all HTML and SVG structure.
- Apply array lengths and string-length limits before rendering.

### Data leakage

- Store no student PII in P0.
- Do not expose raw provider prompts to educator users.
- Keep API keys server-side.
- Sanitize structured logs.

### Cost and denial abuse

- Rate-limit run creation per user.
- Require idempotency keys.
- Apply global and per-run concurrency limits.
- Enforce token and estimated-cost caps before every provider call.
- Bound transient retries and semantic repairs separately.

## Audit requirements

Record:

- Who authored and approved each reference item
- Which versions and hashes a run used
- Every run and stage transition
- Every validator finding and its resolution
- Provider latency and usage
- Who requested changes or approved a workshop
- Which immutable version an educator accessed or reviewed

