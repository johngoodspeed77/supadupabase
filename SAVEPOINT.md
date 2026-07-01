# Save point — v0.2.2-production

**Date:** 2026-06-30  
**Git tag:** `v0.2.2-production`  
**Repository:** https://github.com/johngoodspeed77/supadupabase  
**Branch:** `main`

## Milestone summary

**Production stable** on VM106. Timesheet PWA on VM101 at **v0.3.1-production** integration (PWA `v0.3.0-production`, mail improvements below). Leave-entry schema (migration 009), boss timesheet email from the submitting employee, and **Fuzed Group** email branding deployed.

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

- Auth: email/password, JWT sessions, refresh (`INVITE_ONLY=1` blocks new sign-ups in prod)
- **Invite-only mode** — `INVITE_ONLY=1` in `.env`; admin creates users via Users → Invite
- Data API: REST CRUD with JWT + RLS; **per-user row scoping** enforced server-side
- Admin: projects, **Users** (list, ban, invite, revoke), API keys, Emails test page
- SDK, SQL migrations `001`–`009`
- mail-service: SMTP, timesheet submit email (leave rows), Web Push API
- Docker Compose + Caddy + Cloudflare Tunnel

### Since v0.2.1-production

| Commit | Summary |
|--------|---------|
| `4b138df` | Leave types on `time_entries`; timesheet email template for leave rows |
| `92c1e2b` | Timesheet submit **From** = `"Employee Name" <user@email>`; **Reply-To** = user email; SMTP envelope `MAIL FROM` stays `SMTP_FROM` |
| `fe60026` | Boss email title/footer → **Fuzed Group- Employee Weekly Timesheet** (`TIMESHEET_EMAIL_TITLE`) |
| *(this release)* | Email subject **Week ending** + Sunday date (not Week of Monday) |

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

`001_init` → `009_leave_entries` — apply on VM with migrate profile or `npm run migrate`.

Migration **009** adds `entry_type`, `leave_type`, `leave_duration`, nullable times + CHECK constraints for leave/work rows.

## Timesheet submit email behaviour

| Header / field | Value |
|----------------|--------|
| `From` (display) | `"Employee Name" <user@email>` from `user_settings.employee_name` or email local-part |
| `Reply-To` | Submitting user's login email |
| SMTP `MAIL FROM` | `SMTP_FROM` (Gmail account on VM106) |
| Email title (HTML) | **Fuzed Group- Employee Weekly Timesheet** |
| Subject | `Timesheet — {name} — Week ending {Sunday DD/MM/YYYY}` |

Gmail may show "via gmail.com" when the `From` domain is not a verified send-as alias; replies still go to the employee via `Reply-To`.

## Environment variables (production `.env`)

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD`, `AUTH_SECRET` | Required |
| `JWT_ISSUER`, `PUBLIC_URL` | `https://supadupabase.whitelynx.co.nz` |
| `ADMIN_EMAILS` | Admin login allowlist |
| `INVITE_ONLY` | `1` — block public sign-up |
| `TUNNEL_TOKEN` | cloudflared profile |
| `SMTP_*` | Gmail outbound mail (`SMTP_FROM` = envelope sender) |
| `VAPID_*` | Web Push (mail-service) |
| `TIMESHEET_PUBLIC_URL` | `https://timesheet.whitelynx.co.nz` (invite links) |

Never commit `.env` or tunnel tokens.

## Known follow-up

- Data API: anon/service key auth on `/rest`; RPC
- Weekly push reminder cron fully verified in prod
- Integration tests (RLS + JWT, submit flow)
- License

## Restore / run locally

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
git checkout v0.2.2-production
npm install && npm run build
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

## Last updated

2026-06-30
