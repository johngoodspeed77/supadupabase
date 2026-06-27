# SupaDupaBase — production deployment

Deploy on the dedicated Proxmox VM with Docker Compose, Caddy, and Cloudflare Tunnel.

## Prerequisites

- VM provisioned per [PROXMOX.md](./PROXMOX.md)
- Domain `supadupabase.whitelynx.co.nz` in Cloudflare
- Google OAuth client with redirect URI:
  `https://supadupabase.whitelynx.co.nz/auth/callback/google`

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
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS=you@example.com`

## 2. Build and start

```bash
npm install
npm run build
docker compose -f infra/docker-compose.yml up -d --build
npm run migrate
```

## 3. Cloudflare Tunnel

1. Create tunnel in Cloudflare Zero Trust dashboard
2. Copy tunnel token to `infra/cloudflared/.env` (not committed):

   ```
   TUNNEL_TOKEN=your-token
   ```

3. Route hostname `supadupabase.whitelynx.co.nz` → `http://caddy:80`
4. Start `cloudflared` service (included in `docker-compose.yml`)

See [cloudflared/config.yml.example](./cloudflared/config.yml.example).

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
