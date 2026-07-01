# SupaDupaBase

Self-hosted backend for access control and user data storage — a Supabase-inspired platform you run on your own infrastructure.

Built **in-house** with minimal dependencies: custom auth, custom HTTP API, plain SQL migrations, and a zero-dep client SDK. Admin UI uses a **dark Cyan Hexagons** theme (solid black background).

**Repository:** https://github.com/johngoodspeed77/supadupabase

## Status

**Save point `v0.2.2-production`** (2026-06-30) — **production live** at [supadupabase.whitelynx.co.nz](https://supadupabase.whitelynx.co.nz). Timesheet PWA at [timesheet.whitelynx.co.nz](https://timesheet.whitelynx.co.nz) (**v0.3.1-production** integration).

| Done | Follow-up |
|------|-----------|
| Auth, data API, SDK, admin, mail-service | Data API anon/service key auth, RPC |
| Live Cloudflare Tunnel + Docker (VM106) | Weekly push reminder cron verification |
| Timesheet schema + SMTP (Gmail) | Weekly push reminder cron verification |
| Admin **Users** — invite, ban, list | Integration tests |
| `INVITE_ONLY=1` in production | License |
| Per-user data-api row scoping | |
| Migration **009** leave entries | |
| Timesheet email **From** employee + **Fuzed Group** branding | |

Details: [SAVEPOINT.md](./SAVEPOINT.md) · Deploy: [infra/DEPLOY_AT_HOME.md](./infra/DEPLOY_AT_HOME.md) · **Home PC:** [infra/HOME_PC_SETUP.md](./infra/HOME_PC_SETUP.md) · Remote: [infra/REMOTE_DEPLOY.md](./infra/REMOTE_DEPLOY.md)

**Cursor workspace:** `E:\White Lynx Projects\Cursor\whitelynx.code-workspace`

## Production URLs

| Service | URL |
|---------|-----|
| Admin | https://supadupabase.whitelynx.co.nz/admin/ |
| Auth | https://supadupabase.whitelynx.co.nz/auth/ |
| Data API | https://supadupabase.whitelynx.co.nz/rest/v1/… |
| Mail | https://supadupabase.whitelynx.co.nz/mail/… |
| Timesheet PWA | https://timesheet.whitelynx.co.nz |

## Quick start (local)

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
npm install && npm run build
cp .env.example .env   # set ADMIN_EMAILS and AUTH_SECRET
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

| Service | URL |
|---------|-----|
| Auth | http://localhost:3001 |
| Data API | http://localhost:3002 |
| Admin | http://localhost:3003 |
| Mail | http://localhost:3004 |
| Sample PWA | http://localhost:5173 |

## What it provides

| Capability | Description |
|------------|-------------|
| Auth | Email/password, JWT, sessions; **`INVITE_ONLY`** for closed sign-up |
| Data API | REST over Postgres with RLS + per-user scoping |
| Mail | SMTP outbound (timesheet email, admin test send, invite emails) |
| SDK | `@supadupabase/sdk` — zero runtime deps |
| Admin | Users (invite/ban), projects, API keys, emails |
| Deploy | Docker Compose + Caddy + Cloudflare Tunnel |

**Not Supabase (yet):** no Storage, Realtime, Edge Functions, SQL editor, or dynamic table API. New tables require SQL migrations and a data-api whitelist update.

## In-house stack

| Layer | Implementation |
|-------|----------------|
| HTTP | `packages/server` — Node `http` + tiny router |
| Auth | `node:crypto` scrypt + HMAC JWT |
| Mail | In-house SMTP client + optional `web-push` |
| Database | PostgreSQL 16 + plain SQL migrations |
| Server deps | **`pg` only** (core); `web-push` in mail-service |
| Admin UI | `packages/ui` — no React/Tailwind |

## Production

- **Domain:** https://supadupabase.whitelynx.co.nz
- **VM:** Proxmox VM106 — see [infra/DEPLOY_AT_HOME.md](./infra/DEPLOY_AT_HOME.md)
- **Remote deploy:** [infra/REMOTE_DEPLOY.md](./infra/REMOTE_DEPLOY.md) — deploy from anywhere via Cloudflare
- **SMTP:** Gmail App Password in `.env` (`SMTP_*` vars)
- **Invite-only:** `INVITE_ONLY=1` in `.env` (passed to `auth-service` via compose)

After code changes on the VM:

```bash
cd ~/supadupabase
git pull
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

## Client usage

```ts
import { createClient } from '@supadupabase/sdk'

const client = createClient({
  url: 'https://supadupabase.whitelynx.co.nz',
  authUrl: 'https://supadupabase.whitelynx.co.nz',
  accessToken: session.access_token,
})

const { data } = await client.from('time_entries').select('*')
```

## Theme

Dark mode only — cyan accents (`#22d3ee`) on solid black. See [docs/THEME.md](./docs/THEME.md).

## License

TBD
