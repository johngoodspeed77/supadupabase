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

echo "==> Rebuild migrate image"
$COMPOSE --profile migrate build --no-cache migrate

echo "==> Apply SQL migrations"
$COMPOSE --profile migrate run --rm migrate

echo "==> Migrations complete"
