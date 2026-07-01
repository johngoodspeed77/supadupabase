# SupaDupaBase

Self-hosted backend for access control and user data storage — a Supabase-inspired platform you run on your own infrastructure.

Built **in-house** with minimal dependencies: custom auth, custom HTTP API, plain SQL migrations, and a zero-dep client SDK. Admin UI uses a **dark Cyan Hexagons** theme (solid black background).

**Repository:** https://github.com/johngoodspeed77/supadupabase

## Status

**Save point `v0.3.0-development`** (2026-06-27) — **production live** at [supadupabase.whitelynx.co.nz](https://supadupabase.whitelynx.co.nz) (last deployed tag `v0.2.2-production`). **`main` on GitHub** includes OAuth removal + remote deploy — **pending VM deploy**. Timesheet: [timesheet.whitelynx.co.nz](https://timesheet.whitelynx.co.nz) (`v0.3.2-development` on GitHub, pending VM101).

| Done (on GitHub `main`) | Follow-up |
|---------------------------|-----------|
| Auth, data API, SDK, admin, mail-service | **Fix VM106 deploy-hook** (502 on `/hooks/*`) |
| Invite-only email/password (**no Google OAuth**) | **Deploy timesheet** via VM101 hook (still on `app.js?v=28`) |
| **Remote deploy** — VM101 hook ✅, VM106 ❌ | Enable VM106 hook at home |
| `HOME_PC_SETUP.md` for home LAN deploy | Data API anon/service key auth, RPC |
| Timesheet schema + SMTP, admin Users | Weekly push cron verification |

Details: [SAVEPOINT.md](./SAVEPOINT.md) · **Deploy at home:** [infra/HOME_PC_SETUP.md](./infra/HOME_PC_SETUP.md) · Remote: [infra/REMOTE_DEPLOY.md](./infra/REMOTE_DEPLOY.md)

> **When you get home:** run the [Quick checklist](./infra/HOME_PC_SETUP.md#quick-checklist--run-when-you-get-home) in `HOME_PC_SETUP.md` (VM106 + VM101 deploy, fix VM106 hook 502).

**Cursor workspace:** `E:\White Lynx Projects\Cursor\whitelynx.code-workspace`

## Production URLs

| Service | URL |
|---------|-----|
| Admin | https://supadupabase.whitelynx.co.nz/admin/ |
| Auth | https://supadupabase.whitelynx.co.nz/auth/ |
| Data API | https://supadupabase.whitelynx.co.nz/rest/v1/… |
| Mail | https://supadupabase.whitelynx.co.nz/mail/… |
| Deploy hook | `POST /hooks/deploy` (after setup) |
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
| Deploy | Docker Compose + Caddy + Cloudflare Tunnel + optional **remote webhook** |

**Not Supabase (yet):** no Storage, Realtime, Edge Functions, SQL editor, or dynamic table API.

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
- **VM:** Proxmox VM106 — [infra/DEPLOY_AT_HOME.md](./infra/DEPLOY_AT_HOME.md)
- **At home:** [infra/HOME_PC_SETUP.md](./infra/HOME_PC_SETUP.md) — SSH deploy from GitHub
- **Away from home:** [infra/REMOTE_DEPLOY.md](./infra/REMOTE_DEPLOY.md) — after hook setup
- **GitHub Actions:** [.github/DEPLOY_FROM_GITHUB.md](./.github/DEPLOY_FROM_GITHUB.md)
- **Invite-only:** `INVITE_ONLY=1` in `.env`

```bash
# On VM (or home PC SSH one-liner — see HOME_PC_SETUP.md)
cd ~/supadupabase && git pull && ./infra/deploy-quick.sh

# From dev PC after hooks enabled
npm run deploy:remote
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
