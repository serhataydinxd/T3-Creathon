# Creathon Requirements Traceability

## Exact problem relationship

İMKÂN is an implementation concept for **Problem 3 — Bilim Türkiye AI Eğitim
İçeriği Geliştirme Asistanı**.

The official brief asks for AI-assisted, pedagogically controlled content
development from learning objective through workshop plan, activities, games,
materials/media and expert approval. İMKÂN satisfies that core request and adds
a niche differentiator: resource-aware adaptation with an immutable learning
objective.

## Mandatory MVP mapping

| Problem 3 requirement | İMKÂN implementation | Demo evidence |
|---|---|---|
| Define learning objective, age and model | Approved objective selector, age/grade selector and 5E/GiPSCi template selector | Request form |
| Select workshop domain | Explicit `workshopDomainId` field | Request form |
| Generate an AI lesson/workshop plan | Fixed pedagogy skeleton plus AI-authored stage intent, activity choices, instructions and assessment | Generated workshop view |
| Generate activities and educational games | Approved activity templates plus bounded game-mechanic templates | Workshop stage and printable cards |
| Suggest experiments, gamification, card/board games or alternatives | Safe experiment templates and resource-compatible alternatives | Constraint comparison |
| Recommend visuals, animations, videos, simulations and materials | Controlled media-type recommendations, material quantities and substitutions | Resource panel |
| Preserve pedagogical control | Separate pedagogical review, change request and approval states | Review screen and audit trail |
| Support educator use and feedback | Approved package view, print export and classroom feedback | Educator dashboard |
| Support management and reuse | Version list and read-only manager overview | Manager dashboard |

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
  -> inspect Kazanım Kilidi mappings and validator findings
  -> request a targeted revision or edit
  -> approve the immutable version
```

### Educator flow

```text
open an approved package
  -> view guide and materials
  -> print the activity/game
  -> apply it in class
  -> submit feedback
```

### Manager flow

```text
view generation and approval states
  -> inspect reuse and feedback summaries
  -> manage users and reference-data lifecycle
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

