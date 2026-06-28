#!/usr/bin/env bash
# Run DB migrations on VM — rebuilds migrate image every time (no stale tsx cache)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT"
  exit 1
fi

if [[ "${DOCKER_SUDO:-}" == "1" ]] || ! groups | grep -q '\bdocker\b'; then
  COMPOSE="sudo docker compose -f infra/docker-compose.yml --env-file .env"
else
  COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"
fi

# ~/.docker owned by root breaks buildx on some VMs — legacy builder works without it
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-0}"

if ! grep -q '"migrate": "node dist/migrate.js"' packages/db/package.json; then
  echo "ERROR: packages/db/package.json still uses tsx — run: git fetch origin && git reset --hard origin/main"
  grep '"migrate"' packages/db/package.json || true
  exit 1
fi

echo "==> Rebuild migrate image (commit $(git rev-parse --short HEAD))"
$COMPOSE --profile migrate build --no-cache migrate

echo "==> Apply SQL migrations"
# Explicit entrypoint bypasses any stale image CMD (npm run migrate / tsx)
$COMPOSE --profile migrate run --rm --entrypoint node migrate packages/db/dist/migrate.js

echo "==> Migrations complete"
