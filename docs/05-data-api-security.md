# Data, API and Security

## Relational model

### Identity and curriculum

`users`

- `id`, `email`, `password_hash`, `name`, `role`, `is_active`, timestamps

`curriculum_versions`

- `id`, `name`, `source_url`, `version_label`, `published_at`, `status`

`workshop_domains`

- `id`, `name`, `description`, `status`

`units`

- `id`, `curriculum_version_id`, `workshop_domain_id`, `name`, `order_index`

`objectives`

- `id`, `curriculum_version_id`, `unit_id`, `code`, `canonical_text`
- `content_hash`, `status`, `superseded_by_id`
- `created_by`, `approved_by`, approval timestamps

Approved objectives are immutable. A correction creates a new row.

### Pedagogy and resource templates

`pedagogy_models`

- `id`, `name`, `version`, `status`, `content_hash`, `superseded_by_id`

`pedagogy_stages`

- `id`, `pedagogy_model_id`, `stage_key`, `display_name`, `intent`
- `order_index`, duration bounds and requirement flags

`activity_templates`

- `id`, `name`, `version`, `activity_type`, grade/age bounds
- safety level, supervision requirements, parameter schema JSONB
- resource metadata, status, hash, supersession and approval columns

`game_templates`

- `id`, `name`, `version`, `mechanic`, `slot_schema` JSONB
- `renderer_component_key`, item bounds, status and approval columns

`materials`

- `id`, `key`, `display_name`, `unit`, `unit_cost`
- hazard class, electricity/internet flags, grade bounds

### Generation

`workshop_requests`

- Normalized request constraints and requesting user

`generation_runs`

- Request ID, pinned reference hashes, live/replay mode
- State, idempotency key, token/cost budget, aggregate usage and timestamps

`generation_stages`

- Run, stage and selected template IDs
- Status, output JSONB, claim/lease fields and attempt counters

`generation_events`

- Run ID, monotonic sequence, type, payload JSONB and timestamp

`validator_findings`

- Run/stage, code, severity, path, message and resolution

`provider_calls`

- Provider/model, status, latency, token counts, estimated cost and request ID
- Do not store secrets or unnecessary complete prompts

### Review and delivery

`workshop_versions`

- Workshop/run, parent version, immutable content JSONB and content hash
- Objective/template snapshots, status, creator and creation method

`reviews`

- Version, reviewer, decision, comment and timestamp

`educator_feedback`

- Approved version, educator, rating, comment and timestamp

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
| View operational overview | Own | All reviews | Approved | All |
| Manage users | No | No | No | Yes |

The artifact author cannot approve that same artifact.

## Threat model and controls

### Prompt injection

- Do not accept arbitrary document uploads in P0.
- Length-limit free-text classroom context.
- Mark user text as untrusted data in the prompt.
- Validate every referenced ID server-side.
- Give the model no tools or side effects.

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

