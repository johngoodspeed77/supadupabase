#!/usr/bin/env bash
# Enable HTTPS deploy webhook on VM106 — run from ~/supadupabase on the VM
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy infra/env.production.example first."
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [[ -z "${DEPLOY_HOOK_SECRET:-}" ]]; then
  echo "Add DEPLOY_HOOK_SECRET to .env first:"
  echo "  openssl rand -base64 32"
  exit 1
fi

chmod +x infra/deploy-quick.sh infra/deploy.sh 2>/dev/null || true

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

if [[ "${DOCKER_SUDO:-}" == "1" ]] || ! groups | grep -q '\bdocker\b'; then
  COMPOSE="sudo docker compose -f infra/docker-compose.yml --env-file .env"
else
  COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"
fi

echo "==> Pull latest"
git fetch origin main
git merge --ff-only origin/main

echo "==> Start deploy-hook + refresh Caddy"
$COMPOSE --profile remote up -d --build deploy-hook caddy

echo "==> Health"
sleep 2
curl -fsS "http://localhost/hooks/healthz" | head -c 200
echo ""
echo "Done. Public: curl -fsS https://supadupabase.whitelynx.co.nz/hooks/healthz"
