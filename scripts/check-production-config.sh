#!/usr/bin/env sh
set -eu

require() {
  value=$(printenv "$1" 2>/dev/null || true)
  if [ -z "$value" ]; then
    echo "Missing required deployment value: $1" >&2
    exit 1
  fi
}

require AWS_REGION
require ENVIRONMENT_NAME
require FOUNDATION_STACK
require SERVICE_STACK
require CFN_ROLE_ARN
require AWS_DEPLOY_ROLE_ARN

case "$AWS_REGION" in
  *[!a-z0-9-]*|"") echo "AWS_REGION has an invalid format." >&2; exit 1 ;;
esac

if [ -n "${CERTIFICATE_ARN:-}" ] && [ -z "${SMOKE_BASE_URL:-}" ]; then
  echo "STAGING_BASE_URL is required when certificate_arn enables HTTPS." >&2
  exit 1
fi

case "${SMOKE_BASE_URL:-}" in
  ""|https://*) ;;
  *) echo "STAGING_BASE_URL must use https:// when set." >&2; exit 1 ;;
esac

echo "Production deployment configuration is complete."
