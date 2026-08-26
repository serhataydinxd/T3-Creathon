# Production runbook

This runbook promotes İMKÂN through staging before any public launch. The live
application remains in deterministic `replay` mode; production seeding is never
permitted.

## 1. External prerequisites

Repository-owned automation is ready, but deployment requires these external
values:

- A GitHub remote with `main` protected and CI required.
- An AWS account and selected Region.
- A GitHub `staging` environment with required reviewers.
- Optional Route 53 name and an ACM certificate in the deployment Region.
- A working Docker engine for local smoke verification.

Do not put AWS access keys in GitHub. Bootstrap the OIDC roles once from an
administrator workstation:

```bash
aws cloudformation deploy \
  --stack-name imkan-staging-oidc \
  --template-file infra/aws/github-oidc-role.json \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    GitHubSubject='repo:YOUR_ORG/YOUR_REPOSITORY:environment:staging' \
    EnvironmentName=imkan-staging
```

GitHub repositories using immutable subject claims must instead pass the exact
owner-ID/repository-ID form shown in that repository's OIDC claim. If the AWS
account already has GitHub's OIDC provider, pass its ARN as
`ExistingGitHubOidcProviderArn`. Add the resulting values as GitHub environment
variables:

- `AWS_DEPLOY_ROLE_ARN`
- `AWS_CLOUDFORMATION_ROLE_ARN`
- `AWS_REGION`
- `OIDC_SUBJECT` (the same exact subject used to bootstrap the role)
- `STAGING_BASE_URL` when TLS is enabled

The IAM trust is scoped to the exact repository and GitHub environment. Protect
that environment before the first deployment.

## 2. Local container gate

The Docker context excludes every `.env` file, local database, source PDF, test
artifact and dependency directory. Verify both targets locally:

```bash
docker build --target runner -t imkan-web:local .
docker build --target migration -t imkan-migration:local .
docker compose up -d postgres
npm run db:migrate
npm run db:seed
docker run --rm --network host \
  -e APP_MODE=replay \
  -e DATABASE_URL=postgresql://imkan:imkan-local-only@localhost:54329/imkan \
  imkan-web:local
```

Call `/api/health`, then log in and exercise the role workflow. Local demo
seeding is acceptable only in this disposable environment.

## 3. Staging deployment

Run the **Deploy staging** workflow manually. It performs the following gates:

1. Runs the repository checks.
2. Assumes the AWS role through GitHub OIDC.
3. Deploys the no-NAT foundation and private RDS database.
4. Builds distinct immutable `web-<sha>` and `migration-<sha>` images.
5. Registers the migration release without changing web traffic.
6. Runs schema migrations and the idempotent approved-objective catalog update,
   then requires exit code zero. It never creates demo users.
7. Deploys web with an ECS circuit breaker and automatic rollback.
8. Calls `/api/health` through the load balancer or `STAGING_BASE_URL`.

The demo cost profile uses two public subnets for the ALB and Fargate tasks,
which have public IPs for outbound image and AWS API access. The task security
group accepts port 3000 only from the ALB. RDS is not public and exists in two
isolated subnets. No NAT gateway is provisioned.

This staging template is intentionally disposable: database deletion protection
is off, deleting the stack does not retain a final RDS snapshot, and ECR images
are removed with their repositories. Do not use these deletion settings for the
production stack. To stop recurring staging charges after acceptance, delete the
service stack first and then the foundation stack:

```bash
aws cloudformation delete-stack --stack-name imkan-staging-service
aws cloudformation wait stack-delete-complete --stack-name imkan-staging-service
aws cloudformation delete-stack --stack-name imkan-staging-edge
aws cloudformation wait stack-delete-complete --stack-name imkan-staging-edge
aws cloudformation delete-stack --stack-name imkan-staging-foundation
aws cloudformation wait stack-delete-complete --stack-name imkan-staging-foundation
```

## 4. Create the first manager exactly once

For staging, prefer the **Bootstrap staging manager** workflow. Store
`BOOTSTRAP_MANAGER_EMAIL`, `BOOTSTRAP_MANAGER_NAME` and a unique 20+ character
`BOOTSTRAP_MANAGER_PASSWORD` in the GitHub `staging` environment, then dispatch
the workflow once. It creates and force-deletes an ephemeral Secrets Manager
secret and deletes its temporary CloudFormation stack after the task exits.

Never run `npm run db:seed` against staging or production. Create an ephemeral
Secrets Manager value containing only:

```json
{
  "email": "manager@example.org",
  "name": "Production Manager",
  "password": "GENERATE_A_UNIQUE_PASSWORD"
}
```

Use a password manager to generate at least 20 random characters. Do not place
the JSON on the command line or in the repository; use a permission-restricted
temporary file and delete it immediately after creating the secret.

```bash
aws secretsmanager create-secret \
  --name imkan-staging/bootstrap-manager \
  --secret-string file://bootstrap-manager-secret.json
```

Deploy the temporary task-definition stack with the migration image tag that
just passed migrations:

```bash
aws cloudformation deploy \
  --stack-name imkan-staging-bootstrap-manager \
  --template-file infra/aws/bootstrap-manager.json \
  --role-arn "$AWS_CLOUDFORMATION_ROLE_ARN" \
  --parameter-overrides \
    EnvironmentName=imkan-staging \
    MigrationImageTag=migration-COMMIT_SHA \
    BootstrapSecretArn=SECRET_ARN
```

Run its task definition in the two exported public subnets with the exported ECS
security group and `assignPublicIp=ENABLED`. Wait for the task to stop and require
container exit code zero. The command uses a PostgreSQL advisory lock, refuses if
any manager already exists, hashes the password with Argon2id, creates one active
manager and never logs the password.

```bash
output() {
  aws cloudformation describe-stacks --stack-name imkan-staging-foundation \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" --output text
}

CLUSTER=$(output ClusterName)
SUBNET_A=$(output PublicSubnetAId)
SUBNET_B=$(output PublicSubnetBId)
TASK_SG=$(output EcsSecurityGroupId)
TASK_DEFINITION=$(aws cloudformation describe-stacks \
  --stack-name imkan-staging-bootstrap-manager \
  --query "Stacks[0].Outputs[?OutputKey=='BootstrapTaskDefinitionArn'].OutputValue | [0]" \
  --output text)

TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration \
    "awsvpcConfiguration={subnets=[$SUBNET_A,$SUBNET_B],securityGroups=[$TASK_SG],assignPublicIp=ENABLED}" \
  --query 'tasks[0].taskArn' --output text)

aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN"
aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].{exitCode:exitCode,reason:reason}'
```

Stop and investigate unless `exitCode` is `0`.

After the manager signs in successfully, delete both temporary resources:

```bash
aws cloudformation delete-stack --stack-name imkan-staging-bootstrap-manager
aws cloudformation wait stack-delete-complete --stack-name imkan-staging-bootstrap-manager
aws secretsmanager delete-secret --secret-id SECRET_ARN --force-delete-without-recovery
```

Delete the local secret file securely. Normal managers must subsequently be
created through pending registration and activation, not through this command.

## 5. Staging acceptance

Use the `HttpsUrl` output from `imkan-staging-edge` for every browser test. The
CloudFront hostname supplies HTTPS without an owned domain, and the ALB accepts
traffic only from CloudFront origin ranges, so `AlbDnsName` is expected to time
out from a browser. Never enter real personal data or reuse a real password: the
disposable configuration encrypts viewer-to-edge traffic, while the
CloudFront-to-ALB origin hop is HTTP until a domain and ALB certificate are
attached.

- CI is green for the deployed commit and ECR image scanning has no critical
  finding.
- ALB and container health checks remain green for at least 15 minutes.
- Registration produces a pending account with no session.
- The first manager can activate one account for each role.
- Content expert → pedagogue → manager → educator completes across fresh browser
  sessions, including change request, immutable revision, publication, print and
  feedback.
- Anonymous, educator-generation, CSRF, oversized-body and direct-draft access
  checks behave as the E2E suite specifies.
- No demo account, shared password, student name, uploaded document or provider
  credential exists in the database or logs.
- CloudWatch logs contain request failures but no passwords, cookies or database
  credentials.

## 6. Backup, rollback and recovery

- Keep automated RDS backups for seven days and create a manual snapshot before
  a migration that changes or removes data.
- Migrations must be backward-compatible with the previously deployed web image.
  ECS can roll web back automatically; it cannot reverse a database migration.
- Keep at least the previous web and migration image tags in ECR.
- If the web rollout fails, verify the circuit-breaker rollback, inspect the ECS
  stopped reason and CloudWatch stream, and do not retry until the cause is known.
- If a migration fails, web traffic remains on the previous image. Restore an RDS
  snapshot only after confirming the migration is not safely repairable forward.
- Test snapshot restoration into a separate RDS instance before public launch;
  an untested backup is not a recovery plan.

## 7. Public-launch gates

Production is ready only when staging acceptance is signed off, TLS and the
custom domain are active, deletion protection is `true`, the RDS restore drill
has passed, alarms and a cost budget have owners, the initial manager secret is
deleted, and a rollback rehearsal has succeeded. Promote the same immutable image
digest; do not rebuild a different production image.
