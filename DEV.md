# Local development

Run SupaDupaBase on your machine with Docker Postgres and three Node services.

## Prerequisites

- Node.js 20+
- Docker Desktop (or Docker Engine + Compose)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Build workspace packages
npm run build

# 3. Copy environment file and edit AUTH_SECRET if desired
cp .env.example .env

# 4. Start Postgres
docker compose -f infra/docker-compose.dev.yml up -d

# 5. Run migrations
npm run migrate

# 6. Start services (separate terminals)
npm run dev:auth    # http://localhost:3001
npm run dev:data    # http://localhost:3002
npm run dev:admin   # http://localhost:3003
```

Load `.env` in your shell before starting services (or use a tool like `dotenv-cli`). On PowerShell:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
  }
}
npm run dev:auth
```

## Smoke test

```bash
# Sign up
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password123"}'

# Use access_token from response
curl http://localhost:3002/rest/v1/profiles \
  -H "Authorization: Bearer <access_token>"
```

Open http://localhost:3003 for the admin shell (Cyan Hexagons theme).

## Architecture (local)

| Service      | Port | Package / app        |
|-------------|------|----------------------|
| auth-service | 3001 | `apps/auth-service`  |
| data-api     | 3002 | `apps/data-api`      |
| admin        | 3003 | `apps/admin`         |
| Postgres     | 5432 | `infra/docker-compose.dev.yml` |

## Google OAuth (optional)

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`. Redirect URI for production:

`https://supadupabase.whitelynx.co.nz/auth/callback/google`

For local testing, add `http://localhost:3001/auth/callback/google` in Google Cloud Console and set `PUBLIC_URL=http://localhost:3001`.

## What's not in local dev yet

- Caddy, Cloudflare Tunnel, Proxmox deployment
- API key generation UI
- PATCH/DELETE on data API
- RPC endpoints

See [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) for the full roadmap.
