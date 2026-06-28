#!/usr/bin/env bash
# SupaDupaBase production deploy — run on the Proxmox VM from repo root
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${DOCKER_SUDO:-}" == "1" ]] || ! groups | grep -q '\bdocker\b'; then
  COMPOSE="sudo docker compose -f infra/docker-compose.yml --env-file .env"
else
  COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"
fi

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and set secrets first."
  exit 1
fi

# shellcheck disable=SC1091
source .env

required=(POSTGRES_PASSWORD AUTH_SECRET ADMIN_EMAILS)
for var in "${required[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Set $var in .env"
    exit 1
  fi
done

echo "==> Pull latest from origin/main"
git fetch origin main
git merge --ff-only origin/main

if ! grep -q '"migrate": "node dist/migrate.js"' packages/db/package.json; then
  echo "ERROR: repo on VM is too old for migrations (still expects tsx)."
  echo "Run: cd $ROOT && git fetch origin && git reset --hard origin/main"
  grep '"migrate"' packages/db/package.json || true
  exit 1
fi

echo "==> Build and start core stack"
$COMPOSE up -d --build postgres auth-service data-api mail-service admin caddy

echo "==> Wait for Postgres"
sleep 5

echo "==> Run migrations (commit $(git rev-parse --short HEAD))"
$COMPOSE --profile migrate build --no-cache migrate
$COMPOSE --profile migrate run --rm --entrypoint node migrate packages/db/dist/migrate.js

if [[ -n "${TUNNEL_TOKEN:-}" ]]; then
  echo "==> Start Cloudflare tunnel"
  $COMPOSE --profile tunnel up -d cloudflared
else
  echo "==> Skipping cloudflared (set TUNNEL_TOKEN in .env to enable)"
fi

echo "==> Status"
$COMPOSE ps

echo ""
echo "Deploy complete."
echo "  LAN:  http://$(hostname -I | awk '{print $1}')/admin/"
echo "  Prod: https://supadupabase.whitelynx.co.nz/admin/ (after tunnel + DNS)"
