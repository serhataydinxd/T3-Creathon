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

Replay mode is intentionally deterministic and works without credentials. It
does not claim to be the final live-model or persistence implementation.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, then select **Atölye laboratuvarı**. The default
profile recreates the main demo: 30 students, 40 minutes, no power or internet,
and classroom stationery only.

Run the full verification suite with:

```bash
npm run check
```

## Public deployment

The replay image can be deployed to AWS App Runner without a database or model
secret. Once the persistent web + worker topology is enabled, use separate ECS
Fargate services backed by private Amazon RDS PostgreSQL. See the
[deployment guide](docs/07-deployment.md).

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
