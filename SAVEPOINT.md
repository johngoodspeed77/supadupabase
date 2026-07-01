# Save point — v0.3.0-development

**Date:** 2026-06-27  
**Git commit:** `2ee9aae` (main)  
**Repository:** https://github.com/johngoodspeed77/supadupabase  
**Branch:** `main`  
**Previous tag:** `v0.2.2-production`

## Milestone summary

**Code on GitHub; VM deploy pending.** Since `v0.2.2-production`: Google OAuth removed (email/password + invite-only only), **remote deploy** via HTTPS webhooks (`deploy-hook`), home PC setup guide, and GitHub Actions workflow. Timesheet consumer at **v0.3.2-development** (dirty Save UI) also on GitHub — not yet on VM101.

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

## What’s new on `main` (not yet on VM)

| Commit | Summary |
|--------|---------|
| `76be153` | **Remove Google OAuth** — routes, config, UI, SDK `signInWithGoogle` |
| `9fdc6aa` | **`deploy-hook`** service, `deploy-quick.sh`, `REMOTE_DEPLOY.md`, `npm run deploy:remote` |
| `2ee9aae` | **`HOME_PC_SETUP.md`**, `enable-remote-deploy.sh`, `.github/DEPLOY_FROM_GITHUB.md` |

### Remote deploy (code ready; hooks not enabled on VMs yet)

| Piece | Status |
|-------|--------|
| `apps/deploy-hook` | In repo |
| `POST /hooks/deploy` via Caddy | Needs `--profile remote` on VM106 |
| `DEPLOY_HOOK_SECRET` | Not set on VMs until home setup |
| GitHub Actions `deploy.yml` | Ready; needs repo secret |
| VM101 `/hooks/*` Cloudflare path | Needs one-time tunnel rule → port 5189 |

See [infra/HOME_PC_SETUP.md](./infra/HOME_PC_SETUP.md).

## What still works (unchanged on live VM)

- Auth: email/password, JWT, refresh, **`INVITE_ONLY=1`**
- Data API: REST + RLS + per-user scoping
- Admin: Users invite/ban, API keys, Emails test
- mail-service: timesheet submit, Fuzed Group branding, leave rows
- Migrations `001`–`009`

## Deploy pending changes

**At home (LAN):**

```bash
ssh supadupabase@192.168.1.112
cd ~/supadupabase && git pull && chmod +x infra/deploy-quick.sh && ./infra/deploy-quick.sh
```

**Enable remote deploy (once):**

```bash
# Add DEPLOY_HOOK_SECRET to .env, then:
./infra/enable-remote-deploy.sh
```

**From GitHub Actions:** Actions → Remote deploy (after `DEPLOY_HOOK_SECRET` secret + hooks live).

## Environment variables (additions)

| Variable | Purpose |
|----------|---------|
| `DEPLOY_HOOK_SECRET` | Bearer token for `POST /hooks/deploy` (generate: `openssl rand -base64 32`) |

Removed from docs/examples: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Known follow-up

- Deploy `main` to VM106 (+ timesheet `main` to VM101)
- One-time remote deploy hook setup on both VMs
- Data API: anon/service key auth; RPC
- Weekly push reminder cron verification
- Integration tests; license

## Restore / run locally

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
git checkout main   # or v0.2.2-production for last tagged release
npm install && npm run build
cp .env.example .env
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

## Last updated

2026-06-27 — Save point v0.3.0-development: OAuth removed, remote deploy + home PC setup (`2ee9aae`).
