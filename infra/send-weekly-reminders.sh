#!/usr/bin/env bash
# Send Sunday weekly reminder push notifications (run at 3:00 PM Pacific/Auckland)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT"
  exit 1
fi

if groups | grep -q '\bdocker\b'; then
  COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"
else
  COMPOSE="sudo docker compose -f infra/docker-compose.yml --env-file .env"
fi

$COMPOSE exec -T mail-service npm run send-reminders -w @supadupabase/mail-service
