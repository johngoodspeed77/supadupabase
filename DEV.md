# Local development

Run SupaDupaBase on your machine with Docker Postgres and Node services.

## Prerequisites

- Node.js 22+
- Docker Desktop (or Docker Engine + Compose)

## Quick start

```bash
npm install
npm run build
cp .env.example .env
# Set ADMIN_EMAILS to your dev email

docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate

# All services (auth, data, admin, sample PWA)
npm run dev
```

| Service | URL |
|---------|-----|
| auth-service | http://localhost:3001 |
| data-api | http://localhost:3002 |
| admin | http://localhost:3003 |
| sample PWA | http://localhost:5173 |

## Smoke test

```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password123"}'

curl http://localhost:3002/rest/v1/profiles \
  -H "Authorization: Bearer <access_token>"
```

1. Add `dev@example.com` to `ADMIN_EMAILS` in `.env`
2. Sign up via sample PWA or curl
3. Open admin → Login → Projects / Users / API Keys

## Production

See [infra/DEPLOY.md](./infra/DEPLOY.md) and [infra/PROXMOX.md](./infra/PROXMOX.md).
