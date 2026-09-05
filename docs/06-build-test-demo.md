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
| 24–30 | Konu Kilidi, editing and approval UI | Use a plain mapping/diff table if needed |
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
- Konu Kilidi
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

## Demo script

Runs entirely on authored content. The unauthored-topic path is shown
separately, as an honest secondary demo — leading with it would present a
draft proposal where a jury expects approved content.

1. **Konu.** Astronomi, Havacılık ve Uzay · 12-14 yaş · catalogue topic
   *Uzay Teknolojileri*, which İMKÂN has authored as *Uzay Gözlem Araçları:
   Kendi Modelini Kur*. The lock badge reads "uzman doğrulaması bekliyor",
   because no human has checked the curriculum mapping and the product says so.
2. **Mekân.** Choose Bilim Trabzon, whose page publishes an 80-seat 12 m dome.
   The planetarium route is directly deliverable and the candidate list says
   why.
3. **Aynı konu, başka merkez.** Switch to Bilim Çorum, which publishes nothing
   about a dome. The route is **not** rejected: it becomes "bilgi eksikliği
   nedeniyle belirsiz", with what to verify. This is the sharpest moment in the
   demo — most systems would silently say no.
4. **Doğrulama.** As an educator, open Merkez ve envanter and record that Çorum
   has no planetarium. The verification is stored with the person and the date.
   Return to the lab: the same route is now "uygulanamaz", for a different and
   better reason, and the classroom route is offered instead.
5. **Üret ve yayımla.** Generate, save, submit; pedagogue approves; manager
   publishes.
6. **Uygula.** As the educator, start a delivery from the published version.
   Record 21 participants against the planned 24, 55 minutes against 60, and
   one stage skipped for lack of time. Planned and actual sit side by side.
7. **Raporla.** Draft the report. It states both figures, names the skipped
   stage with its reason, and — because no evidence was observed — says
   explicitly that learning cannot be claimed. Submit it; note that the
   educator cannot approve their own account.
8. **Onayla ve paylaş.** Pedagogue approves, educator's sharing permission is
   already granted, manager publishes to the library.
9. **Uyarla.** From the library entry, pick another centre and read the
   computed compatibility, then create the draft. The source package and its
   report are unchanged; the new draft carries its origin and must be reviewed
   like any other.

The strongest single moment is step 3 into step 4: unknown is treated as
unknown, and a person resolving it changes the answer.

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
- [ ] Konu Kilidi and superseded-version behavior shown
- [ ] Unknown-facility route shown as uncertain, then resolved by verification
- [ ] Planned-versus-actual figures both visible on the report
- [ ] Self-approval refused for a report
- [ ] Safety note absent from the library entry
- [ ] Adaptation leaves the source package published and unchanged
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

