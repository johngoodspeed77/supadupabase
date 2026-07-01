# Save point — v0.3.0-development

**Date:** 2026-07-01  
**Git commit:** `7421989` (main)  
**Repository:** https://github.com/johngoodspeed77/supadupabase  
**Branch:** `main`  
**Previous tag:** `v0.2.2-production`

## Milestone summary

**All code on GitHub — VM deploy pending (owner deploying at home).** Since `v0.2.2-production`: Google OAuth removed, remote deploy webhooks, home PC quick checklist. Timesheet **v0.3.2-development** (dirty Save UI) on GitHub — not yet on VM101.

## Next action (owner)

Run the **[Quick checklist](./infra/HOME_PC_SETUP.md#quick-checklist--run-when-you-get-home)** in `HOME_PC_SETUP.md` from home LAN:

1. VM106 — `git pull` + `./infra/deploy-quick.sh`
2. VM106 — `./infra/enable-remote-deploy.sh` (fix hook **502**)
3. VM101 — timesheet rebuild (`app.js?v=29`)
4. Verify hooks + hard-refresh PWA

## Production (live — last deployed tag)

| Item | Value |
|------|--------|
| Public URL | https://supadupabase.whitelynx.co.nz |
| Last deployed tag | `v0.2.2-production` |
| VM | `supadupabase@192.168.1.112` (VM106) |
| Timesheet consumer | https://timesheet.whitelynx.co.nz (VM101, last deployed `v0.3.1-production`) |
| Compose | `~/supadupabase`, `infra/docker-compose.yml` + `.env` |

**Health checks:**

```bash
curl https://supadupabase.whitelynx.co.nz/auth/healthz
curl https://supadupabase.whitelynx.co.nz/rest/healthz
curl https://supadupabase.whitelynx.co.nz/mail/healthz
```

## What’s on `main` (pending VM deploy)

| Commit | Summary |
|--------|---------|
| `76be153` | **Remove Google OAuth** |
| `9fdc6aa` | **`deploy-hook`**, `deploy-quick.sh`, remote deploy |
| `2ee9aae` | `HOME_PC_SETUP.md`, GitHub Actions |
| `3d0c616`–`42ca69e` | deploy-hook host user + **202 async** response |
| `957c877` | Remote deploy status docs (VM101 OK, VM106 502) |
| `7421989` | **Home deploy quick checklist** |

### Remote deploy status (2026-07-01)

| Target | `/hooks/healthz` | Notes |
|--------|------------------|-------|
| VM101 Timesheet | ✅ **200** | Auth enforced (`401` without token) |
| VM106 SupaDupaBase | ❌ **502** | Fix with `enable-remote-deploy.sh` at home |
| Timesheet PWA | — | Still `app.js?v=28` until VM101 deploy |

See [infra/REMOTE_DEPLOY.md](./infra/REMOTE_DEPLOY.md).

## What still works (unchanged on live VM)

- Auth: email/password, JWT, refresh, **`INVITE_ONLY=1`**
- Data API: REST + RLS + per-user scoping
- Admin: Users invite/ban, API keys, Emails test
- mail-service: timesheet submit, Fuzed Group branding, leave rows
- Migrations `001`–`009`

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DEPLOY_HOOK_SECRET` | Remote deploy bearer token (`openssl rand -base64 32`) |

Removed: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Known follow-up (after home deploy)

- Data API: anon/service key auth; RPC
- Weekly push reminder cron verification
- Integration tests; license

## Restore / run locally

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase && git checkout main
npm install && npm run build
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate && npm run dev
```

## Last updated

2026-07-01 — Save point synced; home deploy checklist on GitHub (`7421989`); VM deploy pending.
