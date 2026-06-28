# Save point — v0.2.0-production-alpha

**Date:** 2026-06-28  
**Git tag:** `v0.2.0-production-alpha` (create after commit + push when ready)  
**Repository:** https://github.com/johngoodspeed77/supadupabase  
**Branch:** `main`

## Milestone summary

**Production is live** on Proxmox VM106 via Cloudflare Tunnel. Core stack + **mail-service** (SMTP, timesheet email, admin test email) deployed. Admin UI includes **Emails** page. Still an **alpha** — VM/git drift, caching quirks, and several product gaps vs Supabase remain. **Bug-fix pass planned next session.**

## Production (live)

| Item | Value |
|------|--------|
| Public URL | https://supadupabase.whitelynx.co.nz |
| Admin | https://supadupabase.whitelynx.co.nz/admin/ |
| VM | `supadupabase@192.168.1.112` (VM106, Ubuntu) |
| Tunnel | Cloudflare Zero Trust → `http://caddy:80` on Docker network `sdb` |
| Compose | `~/supadupabase` on VM, `infra/docker-compose.yml` + `.env` |

**Health checks (public):**

```bash
curl https://supadupabase.whitelynx.co.nz/auth/healthz
curl https://supadupabase.whitelynx.co.nz/rest/healthz
curl https://supadupabase.whitelynx.co.nz/mail/healthz
```

**Redeploy after code changes on VM:**

```bash
cd ~/supadupabase
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.yml --env-file .env --profile tunnel up -d cloudflared
```

Admin static files are **baked into the Docker image** — always rebuild `admin` (and `mail-service` when changed):

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build admin mail-service caddy
```

## What works

### Core (from v0.1.0 + production)

- Auth: email/password, JWT sessions, refresh, Google OAuth (code ready; prod credentials optional)
- Data API: REST CRUD on whitelisted tables with JWT + RLS
- Admin: projects (read-only), users, API keys, login
- SDK, sample PWA, SQL migrations `001`–`005` in repo
- Docker Compose + Caddy + cloudflared profile

### Added since v0.1.0

- **mail-service** — in-house SMTP client (`apps/mail-service/src/smtp.ts`)
- Timesheet weekly email submit (`POST /mail/timesheet/submit`)
- **Admin Emails page** — SMTP status + test send (`GET/POST /admin/mail/*`)
- Gmail SMTP documented in `infra/env.production.example` + `DEPLOY_AT_HOME.md`
- Caddy: `/mail/*`, `/admin/mail/*`, root `308` → `/admin/`
- Timesheet schema (`002`–`005`): `user_settings`, `time_entries`, `week_submissions`, push subscriptions, weekly reminders
- Web Push endpoints in mail-service (`web-push` dep) + `send-reminders` script (WIP)
- Admin session auto-refresh on 401; no-cache headers for HTML/JS
- JWT signature fix (base64url compare) — commit `ebc42f0`

## Known bugs / tech debt (fix next)

Priority for tomorrow’s bug pass:

1. **VM ↔ git drift** — production was updated via `scp` + selective rebuilds; VM has local modifications and may lack migrations `003`–`005`. **Sync:** `git pull` on VM, full `--build`, run migrate profile.
2. **Cloudflare caches admin `app.js`** — mitigated with `?v=` cache-bust + `Cache-Control: no-cache`; may still need Cloudflare cache rules or shorter TTL for `/admin/*`.
3. **Admin session UX** — “Invalid or expired access token” on Emails page confused with Google app password; refresh logic added but logout/re-login may still be needed after long idle.
4. **Projects are read-only in admin** — new projects only via SQL migrations, not UI.
5. **Data API** — `anon` / `service_role` keys created in admin but **not accepted** on `/rest`; RPC returns 501.
6. **Tables whitelisted in code** — new tables need migration + `ALLOWED_TABLES` edit + redeploy `data-api`.
7. **Auth emails** — no verification or password-reset email flows.
8. **Migrate container build** — failed on VM once with Docker snapshot error; `003`–`005` may not be applied in prod DB.
9. **Google OAuth** — may be unset in production `.env`.
10. **web-push dependency** — added to mail-service; VAPID env vars + cron for weekly reminders not fully wired in prod.
11. **Local dev admin** — `app.js` uses `window.location.origin` (port 3003); admin API calls need proxy or `__SDB_AUTH_URL` for split-port dev.

## Not Supabase (by design, for now)

- No Storage, Realtime, Edge Functions, SQL editor, or dynamic table API
- Single Postgres DB; project isolation is schema/convention, not separate databases
- First real consumer: **Timesheet PWA** (`timesheet.whitelynx.co.nz` planned)

## Restore / run locally

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
git checkout v0.2.0-production-alpha   # after tag is pushed
npm install && npm run build
cp .env.example .env                     # ADMIN_EMAILS, AUTH_SECRET, optional SMTP_*
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

## Key commits (v0.1.0 → this save point)

| Commit | Summary |
|--------|---------|
| `3883657` | Timesheet backend + mail-service (on origin) |
| `e1fedba` | Harden migrations runner |
| `ebc42f0` | Fix JWT signature verification |
| `8254e62` | Allow delete own week_submissions |
| `fc8247b` | default_start_time on user_settings |
| `4ef1b9b` | Timesheet email DD/MM/YYYY dates |
| *(uncommitted)* | Admin Emails page, mail test API, session refresh, Caddy routes, push/reminders WIP |

## Environment variables (production `.env`)

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD`, `AUTH_SECRET` | Required |
| `JWT_ISSUER`, `PUBLIC_URL` | `https://supadupabase.whitelynx.co.nz` |
| `ADMIN_EMAILS` | Admin login allowlist (auth + mail-service) |
| `TUNNEL_TOKEN` | cloudflared profile |
| `SMTP_*` | Gmail outbound mail |
| `GOOGLE_CLIENT_ID/SECRET` | Optional OAuth |
| `VAPID_*` | Optional Web Push (mail-service) |

Never commit `.env` or tunnel tokens.
