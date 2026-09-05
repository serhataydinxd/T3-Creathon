# Creathon Requirements Traceability

## Exact problem relationship

İMKÂN is an implementation concept for **Problem 3 — Bilim Türkiye AI Eğitim
İçeriği Geliştirme Asistanı**.

The official brief asks for AI-assisted, pedagogically controlled content
development from learning objective through workshop plan, activities, games,
materials/media and expert approval. İMKÂN satisfies that core request and adds
two differentiators: resource-aware adaptation with an immutable workshop
topic, and a loop that continues past generation — the session is delivered,
reported on, shared and adapted elsewhere, so content becomes evidence rather
than staying a plan.

## Mandatory MVP mapping

| Problem 3 requirement | İMKÂN implementation | Demo evidence |
|---|---|---|
| Define learning objective, age and model | Published catalogue topic selector, age-cohort selector and 5E skeleton; an optional, separately verified MEB mapping | Wizard step 1 |
| Select workshop domain | Theme selector over the seven published Bilim Türkiye themes | Wizard step 1 |
| Generate an AI lesson/workshop plan | Fixed pedagogy skeleton plus AI-authored stage intent, activity choices, instructions and assessment | Generated workshop view |
| Generate activities and educational games | Approved activity templates plus bounded game-mechanic templates | Workshop stage and printable cards |
| Suggest experiments, gamification, card/board games or alternatives | Safe experiment templates and resource-compatible alternatives | Constraint comparison |
| Recommend visuals, animations, videos, simulations and materials | Controlled media-type recommendations, material quantities and substitutions | Resource panel |
| Preserve pedagogical control | Separate pedagogical review, change request and approval states | Review screen and audit trail |
| Support educator use and feedback | Approved package view, print export and classroom feedback | Educator dashboard |
| Support management and reuse | Version list, manager overview, activity library and cross-centre adaptation | Manager dashboard, library |

## Beyond the mandatory MVP

| Capability | İMKÂN implementation | Demo evidence |
|---|---|---|
| Model what a centre actually has | Three-state facility record (available / unavailable / unknown) with source, verifier and date | Merkez ve envanter |
| Refuse to read silence as absence | Routes needing an unrecorded facility are reported uncertain, not rejected | Route candidates panel |
| Explain rather than decide | Every route ranked with computed reasons, cost and what is missing | Route candidates panel |
| Record what actually happened | Delivery record with a frozen plan snapshot; planned and actual side by side | Delivery report |
| Report honestly | AI narrates only recorded facts; unrecorded fields stay "Belirtilmedi" | Report sections |
| Keep approval meaningful | No self-approval; approved reports are superseded, not edited | Report lifecycle |
| Share safely | Library entry needs published source, approved report and the educator's permission; safety notes never travel | Etkinlik kütüphanesi |
| Reuse elsewhere | Computed compatibility against a target centre; adaptation creates an independent draft | Merkezime uyarla |

## Required user flows

### Content expert flow

```text
select domain, objective, age and pedagogy model
  -> define real-world constraints
  -> start generation
  -> inspect generated workshop
  -> edit or submit for review
```

### Pedagogical expert flow

```text
open submitted version
  -> inspect the Konu Kilidi, any curriculum mapping and validator findings
  -> request a targeted revision or edit
  -> approve the immutable version
```

### Educator flow

```text
open a published package
  -> view guide and materials
  -> print the activity/game
  -> deliver the session
  -> record what actually happened (participants, duration, stages, materials)
  -> draft the report from that record, edit it, submit for review
  -> submit feedback
```

### Cross-centre reuse flow

```text
open the activity library
  -> filter by theme, cohort, duration, budget or what the room needs
  -> open a published report
  -> pick a target centre and read the computed compatibility
  -> create an independent draft (the source is never modified)
  -> take that draft through the ordinary review
```

### Manager flow

```text
view generation and approval states
  -> inspect reuse, adaptation and feedback summaries
  -> publish approved reports the educator agreed to share
  -> manage users, centres and reference-data lifecycle
```

## Scope boundary

Problem 3 does not require the system to become:

- A learning-management system
- A student information system
- An automatic curriculum authority
- A general AI chatbot
- A media-generation studio
- An unrestricted experiment generator

Those capabilities are outside P0 unless the official brief changes.

