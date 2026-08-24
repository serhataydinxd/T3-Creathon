# Public deployment

## Current recommendation

The current account-enabled MVP requires PostgreSQL. The preferred public AWS
topology is therefore **ECS Fargate + private Amazon RDS PostgreSQL**, even
while generation itself remains in replay mode.

Run the web image as one Fargate service now. When the background worker is
enabled, keep the same application image and add a second service:

- `web`: public through an Application Load Balancer
- `worker`: private, no inbound traffic, one replica initially

Use Amazon RDS for PostgreSQL in private subnets. This matches the architecture
without forcing the prototype to operate a cluster before it needs one.

## Container verification

```bash
docker build -t imkan .
docker run --rm -p 3000:3000 -e APP_MODE=replay -e DATABASE_URL=... imkan
```

Push the image to a private ECR repository and create a Fargate service behind
an Application Load Balancer listening on port `3000`. Replay mode needs no
LLM credential, but authentication and workflow persistence require RDS.

Before deploying a new web image, run the one-off migration target as a private
ECS task with the same `DATABASE_URL` secret:

```bash
docker build --target migration -t imkan-migration .
```

## Public safety checklist

- Keep `APP_MODE=replay` until the live provider and its cost controls are
  enabled. Authentication, rate limiting and persistence are already required.
- Never put `LLM_API_KEY` or `DATABASE_URL` in the image or GitHub repository.
- Store production values in AWS Secrets Manager and inject them at runtime.
- Keep RDS private; only the web and worker security groups may connect.
- Enable ALB access logs and set a conservative request-size cap.
- Add a custom domain only after TLS, health checks and rollback are verified.
- Do not accept student names, documents or other personal data in P0.

## Health and rollback

The container exposes the Next.js service on `PORT=3000`. Configure the health
check path as `/api/health`. Keep at least the previous ECR image tag so a bad
deployment can be rolled back immediately.
