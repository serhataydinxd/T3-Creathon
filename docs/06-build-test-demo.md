# Build, Test and Demo Plan

## P0 scope

- One subject: science
- Two workshop domains/units
- 12–20 official-source objectives
- One complete approved 5E structure
- GiPSCi only when T3-approved definitions are available
- 6–8 approved activity templates
- At least two genuine experiment templates
- Three game mechanics, one polished first
- Approximately 15 common materials
- Four seeded users
- Live and replay model providers
- Complete request, generation, review, approval and print flow
- Simple manager overview

## 48-hour build order

| Hours | Deliverable | Cut line |
|---|---|---|
| 0–4 | Schema, migrations, authentication and seed users | Freeze the first schema by hour 4 |
| 4–10 | Provider interface, structured schemas and replay fixtures | Fall back to validated JSON if provider-specific strict output blocks progress |
| 10–18 | Run/stage state machine, worker leases, reaper and events | Ship polling before SSE |
| 18–24 | Constraint, inventory and safety engine | Never defer always-hard safety checks |
| 24–30 | Kazanım Kilidi, editing and approval UI | Use a plain mapping/diff table if needed |
| 30–36 | Print view and one polished game renderer | Cap print work at six hours |
| 36–42 | Complete seeds and demo fixtures | Twelve objectives and six activities are the minimum floor |
| 42–46 | Integration tests and rehearsals | Nothing untested after hour 44 enters the live path |
| 46–48 | Deployment, reset rehearsal and buffer | Freeze features |

## Cut order if behind

1. Cut SSE and retain polling.
2. Polish one game renderer; stub the other two.
3. Replace a visual diff with a plain traceability table.
4. Reduce manager analytics to a read-only overview.
5. Move offline PWA caching to P1.

Do not cut:

- Any mandatory Problem 3 requirement
- Kazanım Kilidi
- Pedagogical approval
- Safety and constraint validation
- Replay mode
- Printable output
- End-to-end role flow

## Automated tests

### Unit tests

- One passing and one failing fixture for every validator rule
- Duration, group, material and cost calculations
- Approved-substitution behavior
- Objective/template immutability
- Run and stage state transitions
- Lease expiration and requeue
- Role permission checks

### Contract tests

- Zod and dynamic JSON Schema validation
- Unknown objective/material/template ID rejection
- Missing official-objective field in model-writable schemas
- Game slot count and length bounds
- Provider response replay

### Integration tests

- Idempotent run creation
- Parallel stage isolation
- One targeted repair maximum
- Terminal failure after repair exhaustion
- Budget exceeded with partial outputs retained but not published
- Assembly dependency barrier
- Concurrent approval conflict
- Superseded-objective banner

### End-to-end tests

- Full content expert generation flow
- Pedagogue change request and approval
- Educator approved-package and feedback flow
- Manager overview
- Print view with Turkish characters
- Escaped malicious model strings
- Replay mode with network disabled

## Evaluation metrics

Deterministic targets:

- 100% activities mapped to approved objective IDs
- 100% required pedagogy stages present
- Zero unavailable required materials in strict mode
- Zero safety violations reaching review
- 100% game instances satisfying slot schemas
- Zero unapproved versions visible to educators
- 100% exports using pinned canonical objectives

Prototype AI metrics:

- First-pass structured-output success
- First-pass hard-constraint pass rate
- Repair trigger and success rates
- Per-stage and per-run latency
- Token and estimated cost per run
- Generic-output warning rate
- Pedagogue accept/change/reject rate
- Variation between the same objective under different constraints

Do not generalize prototype measurements to broad pedagogical accuracy.

## Seed and fixture requirements

Each objective records:

- Official code and canonical text
- Source URL
- Curriculum version
- Retrieval date
- Unit and workshop domain

Each activity template records safety, resource, age and parameter metadata.

Adversarial fixtures must include:

- Missing required material
- Missing optional material
- Hard-budget violation
- Age-safety violation
- Internet/electricity mismatch
- Generic output
- Invalid game slot count
- Provider timeout
- Worker crash after claim

## Three-minute demo

1. Select workshop domain, objective, age and 5E model.
2. Enter constraints: no circuit kit, no projector, 30 students, 40 minutes,
   paper/classroom stationery only.
3. Generate and show real durable progress events.
4. Show a resource-compatible plan and printable circuit game.
5. Open Kazanım Kilidi and inspect objective-stage-mechanism-evidence links.
6. Have the pedagogue request one targeted change and approve the revision.
7. Open the approved educator view and print package.

The strongest AI demonstration is a side-by-side generation of the same
objective with two different resource profiles.

## Demo resilience

- Choose `live` or `replay` once at run creation; never mix them mid-run.
- Replay responses must pass through the real validators and assembler.
- Display a visible LIVE/REPLAY badge.
- Test replay with network physically disabled.
- Maintain a recorded backup of the full demo.
- Provide a reset-and-seed command that completes in under two minutes.

## Demo-day checklist

- [ ] Database reset and seed tested from zero
- [ ] All four role logins verified
- [ ] Full demo rehearsed at least three times
- [ ] Live and replay modes tested
- [ ] Required-material blocker demonstrated
- [ ] Optional-material warning demonstrated
- [ ] Hard-budget behavior verified
- [ ] Worker lease recovery verified
- [ ] Turkish print output verified
- [ ] Kazanım Kilidi and superseded-version behavior shown
- [ ] Token, cost and latency metrics visible
- [ ] Backup recording locally available

## Post-P0 roadmap

### P1

- Offline caching of approved packages
- Server-generated PDF files
- More subjects and activity templates
- Improved feedback analytics
- Dedicated worker process from the same image

### P2

- Multi-tenancy
- Approved content uploads with sandboxed parsing
- Retrieval over a substantially larger curated corpus
- LMS/SCORM integrations
- Advanced program analytics

