#!/usr/bin/env bash
# SupaDupaBase production deploy — run on the Proxmox VM from repo root
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"

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

echo "==> Pull latest (optional)"
git pull --ff-only 2>/dev/null || true

echo "==> Build and start core stack"
$COMPOSE up -d --build postgres auth-service data-api mail-service admin caddy

echo "==> Wait for Postgres"
sleep 5

echo "==> Run migrations"
$COMPOSE --profile migrate run --rm migrate

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
