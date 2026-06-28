# SupaDupaBase

Self-hosted backend for access control and user data storage — a Supabase-inspired platform you run on your own infrastructure.

Built **in-house** with minimal dependencies: custom auth, custom HTTP API, plain SQL migrations, and a zero-dep client SDK. Admin UI uses a **dark Cyan Hexagons** theme with a tessellated honeycomb background.

**Repository:** https://github.com/johngoodspeed77/supadupabase

## Status

**Save point `v0.2.0-production-alpha`** (2026-06-28) — **production is live** at [supadupabase.whitelynx.co.nz](https://supadupabase.whitelynx.co.nz). Alpha quality; bug-fix pass next.

| Done | In progress |
|------|-------------|
| Auth, data API, SDK, admin, mail-service | VM/git sync, migration catch-up |
| Live Cloudflare Tunnel + Docker on Proxmox VM | Data API anon/service key auth, RPC |
| Timesheet schema + SMTP (Gmail) | Timesheet PWA on production |
| Admin **Emails** page (test SMTP) | Google OAuth in prod, push reminder cron |

Details: [SAVEPOINT.md](./SAVEPOINT.md) · Deploy: [infra/DEPLOY_AT_HOME.md](./infra/DEPLOY_AT_HOME.md) · Architecture: [AGENT_HANDOFF.md](./AGENT_HANDOFF.md)

## Production URLs

| Service | URL |
|---------|-----|
| Admin | https://supadupabase.whitelynx.co.nz/admin/ |
| Auth | https://supadupabase.whitelynx.co.nz/auth/ |
| Data API | https://supadupabase.whitelynx.co.nz/rest/v1/… |
| Mail | https://supadupabase.whitelynx.co.nz/mail/… |

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
| Auth | In-house email/password + Google OAuth, JWT, sessions |
| Data API | REST over Postgres with RLS per user |
| Mail | SMTP outbound (timesheet email, admin test send) |
| SDK | `@supadupabase/sdk` — zero runtime deps |
| Admin | Cyan Hexagons dashboard — projects, users, keys, emails |
| Deploy | Docker Compose + Caddy + Cloudflare Tunnel |

**Not Supabase (yet):** no Storage, Realtime, Edge Functions, SQL editor, or dynamic table API. New tables require SQL migrations and a data-api whitelist update.

## In-house stack

| Layer | Implementation |
|-------|----------------|
| HTTP | `packages/server` — Node `http` + tiny router |
| Auth | `node:crypto` scrypt + HMAC JWT |
| Google login | In-house OAuth (`fetch` to Google) |
| Mail | In-house SMTP client + optional `web-push` |
| Database | PostgreSQL 16 + plain SQL migrations |
| Server deps | **`pg` only** (core); `web-push` in mail-service |
| Admin UI | `packages/ui` — no React/Tailwind |

## Production

- **Domain:** https://supadupabase.whitelynx.co.nz
- **VM:** Proxmox VM106 — see [infra/DEPLOY_AT_HOME.md](./infra/DEPLOY_AT_HOME.md)
- **SMTP:** Gmail App Password in `.env` (`SMTP_*` vars)

After code changes on the VM:

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build admin mail-service
```

## Client usage

```ts
import { createClient } from '@supadupabase/sdk'

const client = createClient({
  url: 'https://supadupabase.whitelynx.co.nz',
  authUrl: 'https://supadupabase.whitelynx.co.nz',
  anonKey: process.env.SUPADUPABASE_ANON_KEY!,
})

await client.auth.signInWithGoogle({ redirectTo: window.location.origin })
const { data } = await client.from('profiles').select('*')
```

## Theme

Dark mode only — cyan accents (`#22d3ee`) on charcoal with tessellated honeycomb tile. See [docs/THEME.md](./docs/THEME.md).

## License

TBD
