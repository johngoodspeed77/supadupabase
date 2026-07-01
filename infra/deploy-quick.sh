#!/usr/bin/env bash
# Fast production update — git pull + docker rebuild (used by deploy-hook and remote scripts)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${DOCKER_SUDO:-}" == "1" ]] || { [[ "$(id -u)" -ne 0 ]] && ! groups | grep -q '\bdocker\b'; }; then
  COMPOSE="sudo docker compose -f infra/docker-compose.yml --env-file .env"
else
  COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"
fi

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-0}"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT"
  exit 1
fi

# shellcheck disable=SC1091
source .env

SERVICES="${DEPLOY_SERVICES:-auth-service data-api mail-service admin}"

echo "==> Pull latest from origin/main"
git fetch origin main
git merge --ff-only origin/main
echo "==> At commit $(git rev-parse --short HEAD)"

echo "==> Rebuild: $SERVICES"
$COMPOSE up -d --build $SERVICES

if [[ "${DEPLOY_MIGRATE:-}" == "1" ]]; then
  echo "==> Run migrations"
  sleep 3
  $COMPOSE --profile migrate build migrate
  $COMPOSE --profile migrate run --rm --entrypoint node migrate packages/db/dist/migrate.js
fi

if [[ -n "${TUNNEL_TOKEN:-}" ]]; then
  $COMPOSE --profile tunnel up -d cloudflared
fi

if [[ -n "${DEPLOY_HOOK_SECRET:-}" ]]; then
  $COMPOSE --profile remote up -d deploy-hook
fi

echo "==> Done"
$COMPOSE ps
