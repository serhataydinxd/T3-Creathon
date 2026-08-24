# Public deployment

## Current recommendation

For the replay MVP, deploy the standalone Docker image to **AWS App Runner**.
It gives the team a public HTTPS endpoint with minimal operational work while
the application is a single web process.

When the PostgreSQL-backed worker is enabled, keep the same image but move to
**ECS Fargate** with two services:

- `web`: public through an Application Load Balancer
- `worker`: private, no inbound traffic, one replica initially

Use Amazon RDS for PostgreSQL in private subnets. This matches the architecture
without forcing the prototype to operate a cluster before it needs one.

## Replay deployment

```bash
docker build -t imkan .
docker run --rm -p 3000:3000 -e APP_MODE=replay imkan
```

Push this image to a private ECR repository and create an App Runner service
listening on port `3000`. The replay deployment intentionally needs no database
or LLM credential.

## Public safety checklist

- Keep `APP_MODE=replay` until authentication, rate limiting and PostgreSQL
  persistence are enabled.
- Never put `LLM_API_KEY` or `DATABASE_URL` in the image or GitHub repository.
- Store production values in AWS Secrets Manager and inject them at runtime.
- Keep RDS private; only the web and worker security groups may connect.
- Enable App Runner or ALB access logs and set a conservative request-size cap.
- Add a custom domain only after TLS, health checks and rollback are verified.
- Do not accept student names, documents or other personal data in P0.

## Health and rollback

The container exposes the Next.js service on `PORT=3000`. Configure the health
check path as `/api/health`. Keep at least the previous ECR image tag so a bad
deployment can be rolled back immediately.
