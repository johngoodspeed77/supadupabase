# Save point — v0.1.0-local-mvp

**Date:** 2026-06-27  
**Git tag:** `v0.1.0-local-mvp` (after this commit)  
**Repository:** https://github.com/johngoodspeed77/supadupabase  
**Branch:** `main`

## Milestone summary

Local-development MVP is **complete and on GitHub**. Production VM deployment is **not started**.

## What works

- In-house monorepo (`packages/shared`, `server`, `db`, `ui`, `sdk`)
- Auth service: email/password, Google OAuth, refresh, admin routes, API keys
- Data API: GET/POST/PATCH/DELETE on `profiles` with JWT + Postgres RLS
- Admin dashboard: Cyan Hexagons theme, projects/users/keys (via admin API)
- Sample PWA: signup, session refresh, RLS-scoped profile read/update
- Local Postgres via `infra/docker-compose.dev.yml`
- Production stack **documented** in `infra/docker-compose.yml`, `DEPLOY.md`, `PROXMOX.md`

## Not done yet

- Proxmox VM provisioning
- Cloudflare Tunnel live on `supadupabase.whitelynx.co.nz`
- Google OAuth production credentials
- Integration tests for RLS
- RPC endpoints, anon/service key verification on data API
- First real consumer site/PWA (beyond sample)

## Restore / run from this save point

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
git checkout v0.1.0-local-mvp   # after tag is pushed
npm install && npm run build
cp .env.example .env            # set ADMIN_EMAILS, AUTH_SECRET
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

## Key commits (oldest → newest)

| Commit | Summary |
|--------|---------|
| `11023c8` | Monorepo scaffold, shared + server |
| `05d5bf0` | DB migrations, Cyan Hexagons UI |
| `64bbeb2` | Auth service MVP |
| `b0e2995` | Data API MVP |
| `a4518a8` | Zero-dep SDK |
| `debf39c` | Admin shell, dev compose, DEV.md |
| `db8058a` | Sample PWA, production infra, admin wiring |
