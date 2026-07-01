# SupaDupaBase — production deployment

Deploy on the dedicated Proxmox VM with Docker Compose, Caddy, and Cloudflare Tunnel.

## Prerequisites

- VM provisioned per [PROXMOX.md](./PROXMOX.md)
- Domain `supadupabase.whitelynx.co.nz` in Cloudflare

## 1. Environment

```bash
cp .env.example .env
```

Set at minimum:

- `AUTH_SECRET` — long random string
- `POSTGRES_PASSWORD` — strong password
- `DATABASE_URL` — matches compose postgres service
- `PUBLIC_URL=https://supadupabase.whitelynx.co.nz`
- `JWT_ISSUER=https://supadupabase.whitelynx.co.nz`
- `ADMIN_EMAILS=you@example.com`

## 2. Build and start

**One command (on the VM):**

```bash
chmod +x infra/deploy.sh
cp infra/env.production.example .env
# edit .env — set POSTGRES_PASSWORD, AUTH_SECRET, ADMIN_EMAILS, TUNNEL_TOKEN
./infra/deploy.sh
```

**Manual steps:**

```bash
npm install
npm run build
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.yml --env-file .env --profile migrate run --rm migrate
docker compose -f infra/docker-compose.yml --env-file .env --profile tunnel up -d cloudflared
```

Use `infra/env.production.example` as the production `.env` template.

## 3. Cloudflare Tunnel

1. Create tunnel in Cloudflare Zero Trust dashboard
2. Copy tunnel token into **`TUNNEL_TOKEN`** in repo root `.env` (not committed)
3. Route hostname `supadupabase.whitelynx.co.nz` → `http://caddy:80`
4. `./infra/deploy.sh` starts cloudflared automatically when `TUNNEL_TOKEN` is set

See [DEPLOY_AT_HOME.md](./DEPLOY_AT_HOME.md) for the full home checklist.

## 4. Verify

```bash
curl https://supadupabase.whitelynx.co.nz/auth/healthz
curl https://supadupabase.whitelynx.co.nz/rest/healthz
```

Open `https://supadupabase.whitelynx.co.nz/admin/` for the admin UI (via Caddy).

## Service map (Caddy)

| Path | Service |
|------|---------|
| `/auth/*` | auth-service:3001 |
| `/admin/*` | admin static :3003 |
| `/rest/*` | data-api:3002 |
| `/` | admin or redirect |

## Updates

```bash
git pull
npm run build
docker compose -f infra/docker-compose.yml up -d --build
npm run migrate
```
