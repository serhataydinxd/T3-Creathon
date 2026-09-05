# Product Brief

## Selected problem

We selected **Problem 3 — Bilim Türkiye AI Eğitim İçeriği Geliştirme
Asistanı**, published by the Eğitim Ar-Ge Koordinatörlüğü.

The requested product accelerates the creation of pedagogically controlled
education content. It must turn learning objectives, age groups and teaching
models into workshop plans, activities, games, media/material suggestions and
approved reusable content packages.

İMKÂN is the product concept with which we answer that problem. It is not a
separate Creathon problem and it is not a general-purpose education chatbot.

The product covers a full loop rather than a single generation step:

```text
Design -> Deliver -> Report -> Share -> Adapt for another centre
```

Content that has only been designed is a plan. Content that has been delivered,
reported on, approved and shared is evidence — and evidence is what another
centre can actually reuse.

## Product thesis

Generic lesson-plan generators assume ideal resources. İMKÂN starts with the
resources that actually exist and adapts the workshop without changing its
approved learning objective.

The user supplies:

- Workshop domain
- Approved learning objective
- Age or grade group
- 5E or a T3-approved GiPSCi structure
- Total duration
- Class and group size
- Available materials
- Hard or flexible budget
- Electricity and internet availability
- Accessibility requirements

The system produces:

- A stage-by-stage workshop plan
- Approved experiment or activity adaptations
- Educational games and printable artifacts
- Materials, quantities and substitutions
- Visual, animation, video and simulation recommendations
- Formative assessment prompts and expected evidence
- An explicit objective-to-activity map
- A versioned package requiring pedagogical approval

## Differentiating feature: Konu Kilidi

The Bilim Türkiye workshop topic is an immutable, approved reference. AI may
adapt the activity, explanation, materials, game mechanic and assessment, but
it cannot replace or silently rewrite the topic.

The topic is the product's identity: theme, age cohort, title, as published in
Bilim Türkiye's own catalogue. A MEB learning outcome is an optional *mapping*
onto a topic, never the topic itself, and it carries its own verification
state — nobody has checked the corpus mappings against the source documents
yet, and the interface says so rather than showing them as approved.

Every activity exposes this chain:

```text
locked workshop topic
  -> pedagogy stage
  -> activity or game mechanism
  -> explanation of the connection
  -> assessment evidence
```

## Second differentiating feature: unknown is an answer

A centre facility has three states — available, unavailable, unknown — and the
third is the one that matters. Twenty-five of the thirty centres publish
nothing about whether they have a planetarium, and reading that silence as "no"
discards a route on the strength of missing paperwork.

Research can establish that a page names a dome. Only a person standing in the
building can establish that a centre lacks one. So a route needing an
unrecorded facility is reported as *uncertain*, with what to check, rather than
rejected — and an educator who verifies the absence changes the outcome.

## What AI decides

AI remains load-bearing in:

- Selecting compatible approved activity and game templates
- Reconciling competing time, budget, inventory and group constraints
- Adapting explanations and instructions to the age group
- Generating driving questions, transitions and differentiation notes
- Filling bounded educational-game content
- Producing assessment prompts and expected evidence
- Explaining the objective-to-activity relationship
- Repairing one invalid stage in response to typed validator findings

## What AI must not decide

- It must not create or approve curriculum objectives.
- It must not approve its own workshop.
- It must not invent unrestricted science experiments.

In delivery reports its scope is narrower still. It narrates what an educator
recorded and never completes it:

- It must not invent a participant count, duration or cost.
- It must not describe a skipped stage as delivered.
- It must not assert learning that nobody observed.
- It must not soften or omit a safety incident.
- Anything unrecorded stays "Belirtilmedi".
- It must not bypass safety, inventory or age constraints.
- It must not generate raw HTML or SVG.
- It must not make a final pedagogical suitability decision.

## Users

### Content expert

- Creates and versions objectives and templates.
- Starts workshop generation.
- Edits generated drafts.
- Submits content for pedagogical review.

### Pedagogical expert

- Approves objectives and templates authored by another user.
- Reviews the Konu Kilidi and, where present, the curriculum mapping.
- Requests changes or approves a workshop version.

### Educator

- Opens approved workshop packages.
- Uses teacher guides, activities and printable games.
- Leaves classroom feedback.

### Education manager

- Manages users.
- Monitors generation status, approvals, versions and reuse.
- Reviews high-level operational and quality indicators.

## Product principles

1. Hard constraints are checked by code, never by model opinion.
2. Canonical curriculum data is immutable after approval.
3. Generated drafts are never delivered before human approval.
4. Safety comes from approved bounded templates and deterministic rules.
5. The demo must show contextual adaptation, not merely text generation.
6. A small, polished and traceable corpus is preferable to shallow breadth.

