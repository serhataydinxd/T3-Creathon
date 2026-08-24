# İMKÂN

İMKÂN is our proposed product for **Problem 3 — Bilim Türkiye AI Eğitim
İçeriği Geliştirme Asistanı** in the T3 Vakfı Yapay Zekâ Creathon problem
booklet.

> Kazanım aynı kalır; atölye, okulun imkânlarına göre yeniden tasarlanır.

İMKÂN converts an approved learning objective into an age-appropriate,
5E/GiPSCi-aligned workshop package under real constraints such as time,
class size, budget, available materials, electricity, internet and
accessibility. A pedagogical expert reviews and approves every generated
version before educators can use it.

## Current implementation

The repository now contains a runnable public-demo vertical slice:

- Resource-profile form for time, class/group size, budget, power, internet,
  materials and accessibility
- Server-side replay generation through `POST /api/demo/generate`
- Two genuine routes for the same objective: physical circuit or an approved
  paper-based model
- Exact duration/group/material-cost calculations and typed findings
- Five-stage 5E plan with explicit objective-to-evidence traceability
- Pedagogical approve/change-request transition
- Educator print package with teacher and student instructions
- PostgreSQL/Drizzle schema foundation, Docker image and AWS deployment notes
- Pending-account registration with manager role activation
- Argon2id passwords and revocable, database-backed opaque sessions
- Persistent draft → review → approval → publication → feedback workflow
- Immutable revision history and audited status transitions
- Production-browser Playwright and axe accessibility coverage

Replay generation is intentionally deterministic and needs no model-provider
credential. Accounts, reviews, publication and feedback are persisted; the live
LLM provider remains a later phase.

## Run locally

Requirements: Node.js 24 or newer.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`, then select **Atölye laboratuvarı**. The default
profile recreates the main demo: 30 students, 40 minutes, no power or internet,
and classroom stationery only.

Run the full verification suite with:

```bash
npm run check
```

The repository can run browser tests without Docker by using embedded PGlite,
which executes the same committed PostgreSQL migrations:

```bash
npx playwright install chromium
npm run test:e2e
```

Seeded local accounts use `I.mkanDemo!2026` unless `DEMO_PASSWORD` is set:

- `content@imkan.test`
- `pedagogue@imkan.test`
- `educator@imkan.test`
- `manager@imkan.test`

Publicly registered accounts remain pending and receive no role or session
until a manager activates them.

## Public deployment

Deploy the account-enabled replay application to ECS Fargate backed by private
Amazon RDS PostgreSQL. Replay mode requires no model-provider secret. A second
private Fargate service can run the worker when live generation is enabled. See
the [deployment guide](docs/07-deployment.md).

Do not put secrets, student data or real user data in the public demo. Copy
`.env.example` to `.env.local` only for local development; `.env*` files are
excluded from Git and the Docker build context.

## Documentation

- [Product brief](docs/01-product-brief.md)
- [Creathon requirement traceability](docs/02-requirements-traceability.md)
- [Technical architecture](docs/03-technical-architecture.md)
- [AI generation and validation](docs/04-ai-generation-validation.md)
- [Data, API and security](docs/05-data-api-security.md)
- [Build, testing and demo plan](docs/06-build-test-demo.md)
- [Public deployment](docs/07-deployment.md)

The original Creathon problem booklet is retained locally for traceability but
excluded from the public repository until redistribution permission is
confirmed.
