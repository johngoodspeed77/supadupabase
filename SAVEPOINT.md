# Save point — v0.2.1-production

**Date:** 2026-06-29  
**Git tag:** `v0.2.1-production`  
**Repository:** https://github.com/johngoodspeed77/supadupabase  
**Branch:** `main`

## Milestone summary

**Production stable** on VM106. Timesheet PWA on VM101 is live and invite-only. Admin user management, per-user data scoping, SMTP, and `INVITE_ONLY` auth are deployed.

## Production (live)

| Item | Value |
|------|--------|
| Public URL | https://supadupabase.whitelynx.co.nz |
| Admin | https://supadupabase.whitelynx.co.nz/admin/ |
| VM | `supadupabase@192.168.1.112` (VM106) |
| Timesheet consumer | https://timesheet.whitelynx.co.nz (VM101) |
| Compose | `~/supadupabase`, `infra/docker-compose.yml` + `.env` |

**Health checks:**

```bash
curl https://supadupabase.whitelynx.co.nz/auth/healthz
curl https://supadupabase.whitelynx.co.nz/rest/healthz
curl https://supadupabase.whitelynx.co.nz/mail/healthz
```

**Redeploy after code changes on VM:**

```bash
cd ~/supadupabase
git pull
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

Rebuild specific services when needed:

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build auth-service admin mail-service data-api
```

## What works

### Core

- Auth: email/password, JWT sessions, refresh, Google OAuth (code ready; `INVITE_ONLY=1` blocks new sign-ups in prod)
- **Invite-only mode** — `INVITE_ONLY=1` in `.env`; admin creates users via Users → Invite
- Data API: REST CRUD with JWT + RLS; **per-user row scoping** enforced server-side
- Admin: projects, **Users** (list, ban, invite, revoke), API keys, Emails test page
- SDK, SQL migrations `001`–`008`
- mail-service: SMTP, timesheet submit email, Web Push API
- Docker Compose + Caddy + Cloudflare Tunnel

### Since v0.2.0-production-alpha

| Commit | Summary |
|--------|---------|
| `3382719` | Per-user row scoping in data-api |
| `38155a8` | Persistent auth sessions docs |
| `51950f1` | Admin user management + invites (`008_user_management.sql`) |
| `bf30c50` | Admin auth module path behind `/admin` proxy |
| `4b923e1` | Admin refresh without false logout |
| `dcbdf4c` | `INVITE_ONLY` flag on auth-service |
| `1c5c329` | Wire `INVITE_ONLY` through docker-compose |

## Migrations (repo)

`001_init` → `008_user_management` — apply on VM with migrate profile or `npm run migrate`.

## Environment variables (production `.env`)

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD`, `AUTH_SECRET` | Required |
| `JWT_ISSUER`, `PUBLIC_URL` | `https://supadupabase.whitelynx.co.nz` |
| `ADMIN_EMAILS` | Admin login allowlist |
| `INVITE_ONLY` | `1` — block public sign-up and new Google accounts |
| `TUNNEL_TOKEN` | cloudflared profile |
| `SMTP_*` | Gmail outbound mail |
| `GOOGLE_CLIENT_ID/SECRET` | Optional OAuth |
| `VAPID_*` | Web Push (mail-service) |
| `TIMESHEET_PUBLIC_URL` | `https://timesheet.whitelynx.co.nz` (invite links) |

Never commit `.env` or tunnel tokens.

## Known follow-up

- Data API: anon/service key auth on `/rest`; RPC
- Google OAuth for timesheet origin (optional while invite-only)
- Weekly push reminder cron fully verified in prod
- Integration tests (RLS + JWT)
- License

## Restore / run locally

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
git checkout v0.2.1-production
npm install && npm run build
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

## Last updated

2026-06-29
