# SupaDupaBase — Agent handoff

> **Read this first** when picking up work on this repository. Update this file when major decisions or milestones change.

## Project summary

**SupaDupaBase** is a custom, self-hosted alternative to Supabase for the owner's websites and PWAs. Greenfield Node/TypeScript monorepo with Postgres RLS, inspired by Supabase's security model and client ergonomics.

**Dependency philosophy:** **In-house first** — server runtime dep `pg` only on core services. No Better Auth, Drizzle, Hono, React, or UI frameworks. See [docs/IN_HOUSE.md](./docs/IN_HOUSE.md). *Exception:* `mail-service` uses `web-push` for PWA reminders (owner-approved direction).

**UI:** **Dark mode only** — **Cyan Hexagons** theme (solid black background). See [docs/THEME.md](./docs/THEME.md).

**GitHub:** https://github.com/johngoodspeed77/supadupabase (`main`)

## Save point — v0.3.0-development (2026-06-27)

**Current stage:** **Production live** on VM106 at tag `v0.2.2-production`; **`main` ahead** with OAuth removal + remote deploy (not deployed to VM yet). Timesheet on VM101 last deployed `v0.3.1-production`; timesheet `main` has v0.3.2 UI (pending deploy). See [SAVEPOINT.md](./SAVEPOINT.md).

**Public:** https://supadupabase.whitelynx.co.nz  
**VM:** `supadupabase@192.168.1.112` · compose at `~/supadupabase`  
**Timesheet (consumer):** https://timesheet.whitelynx.co.nz on VM101 — see [docs/STACK.md](./docs/STACK.md)

**One Cursor workspace:** `E:\White Lynx Projects\Cursor\whitelynx.code-workspace` (SupaDupaBase + Timesheet App)

### Completed

- [x] Monorepo scaffold (`packages/shared`, `server`, `db`, `ui`, `sdk`)
- [x] Auth service (email/password, refresh, admin routes, API keys, **`INVITE_ONLY`**)
- [x] **No Google OAuth** — removed; invite-only email/password only (`76be153`)
- [x] Data API (GET/POST/PATCH/DELETE, RLS, **per-user row scoping**)
- [x] Admin UI (projects, **Users** invite/ban, API keys, **Emails** test page)
- [x] Timesheet schema/migrations (`002`–`009`)
- [x] **mail-service** — SMTP, timesheet submit (leave rows, employee **From** / **Reply-To**, **Fuzed Group** title), invite email, Web Push API
- [x] **deploy-hook** + `deploy-quick.sh` — remote HTTPS deploy via Cloudflare (`9fdc6aa`)
- [x] **HOME_PC_SETUP.md** + GitHub Actions `deploy.yml` (`2ee9aae`)
- [x] Proxmox VM106 + VM101 Timesheet (Option B)
- [x] Cloudflare Tunnel → Caddy → services
- [x] Gmail SMTP on VM106
- [x] Local dev: `docker-compose.dev.yml`, `DEV.md`, `npm run dev`

### In progress / deferred

- [ ] **Deploy `main` to VM106** — home PC or remote hook (see HOME_PC_SETUP.md)
- [ ] **Enable remote deploy hooks** on VM106 + VM101 (one-time `DEPLOY_HOOK_SECRET`)
- [ ] Data API: RPC, anon/service key auth on `/rest`
- [ ] Admin: create projects from UI; dynamic table whitelist
- [ ] Auth: verification + password-reset emails
- [ ] Weekly push reminder cron fully verified in prod
- [ ] Integration tests (RLS + JWT)
- [ ] License

## Owner goals

- Central auth and user data for multiple sites/PWAs
- Full control on own hardware (Proxmox)
- Email/password login with admin invites (no Google OAuth)
- Remote access via Cloudflare Tunnel (no router port forwarding)
- Deploy from away from home after hook setup
- Supabase-like DX (`createClient`, `.from('table').select()`)
- Outbound email from `johngoodspeed77@gmail.com` (Gmail App Password in `.env`)
- Minimal external dependencies

## Confirmed decisions

| Topic | Decision |
|-------|----------|
| Product name | **SupaDupaBase** |
| NPM package | `@supadupabase/sdk` |
| GitHub | `johngoodspeed77/supadupabase` |
| Dependencies | In-house first — server: `pg` only; `web-push` in mail-service |
| Auth | scrypt + JWT; invite-only email/password (**no OAuth**) |
| Data API | `packages/server` on Node `http` |
| Migrations | Plain SQL + migration runner |
| Admin UI | Static HTML + Cyan Hexagons CSS + vanilla JS |
| SDK | Zero runtime deps; optional `authUrl` for local split ports |
| Remote deploy | `deploy-hook` + `DEPLOY_HOOK_SECRET`; GitHub Actions optional |
| VM | Ubuntu 24.04 on Proxmox VM106 (`192.168.1.112`) |
| Public access | Cloudflare Tunnel → Caddy |
| Database | PostgreSQL 16 + RLS |
| Production domain | `supadupabase.whitelynx.co.nz` |
| SMTP | Gmail (`smtp.gmail.com:587`, App Password) |

## Repository structure

```
supadupabase/
  apps/
    auth-service/
    data-api/
    admin/
    mail-service/
    deploy-hook/       # Remote HTTPS deploy webhook
    sample-pwa/
  packages/
    server/, db/, sdk/, shared/, ui/
  infra/
    HOME_PC_SETUP.md, REMOTE_DEPLOY.md, enable-remote-deploy.sh
    docker-compose.yml, Caddyfile, deploy-quick.sh
  .github/workflows/deploy.yml
  SAVEPOINT.md
```

## Next work (recommended order)

1. **Home PC deploy** — [infra/HOME_PC_SETUP.md](./infra/HOME_PC_SETUP.md) section A (VM106 + VM101)
2. **Enable remote hooks** — section B + GitHub secret `DEPLOY_HOOK_SECRET`
3. anon/service key auth on data API
4. RLS integration tests

## Auth service contract

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Email registration (blocked when `INVITE_ONLY=1`) |
| POST | `/auth/login` | Email login |
| POST | `/auth/logout` | End session |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Current user |
| POST | `/auth/api-keys` | Create API key (admin) |
| GET | `/admin/projects` | List projects (admin) |
| GET | `/admin/users` | List users (admin) |
| GET | `/admin/api-keys` | List keys (admin) |

Admin routes require bearer JWT + email in `ADMIN_EMAILS`.

## Deploy hook contract

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/hooks/healthz` | Hook status |
| POST | `/hooks/deploy` | `git pull` + docker rebuild (Bearer `DEPLOY_HOOK_SECRET`) |

## Mail service contract

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/mail/healthz` | Health |
| POST | `/mail/timesheet/submit` | Email weekly timesheet to boss |
| POST | `/mail/push/subscribe` | Save push subscription |

See full table in prior docs or mail-service routes.

## Data API contract

**Whitelisted tables:** `profiles`, `user_settings`, `time_entries`, `week_submissions`.

## Security rules (non-negotiable)

- Never commit `.env`, tunnel tokens, `DEPLOY_HOOK_SECRET`, SMTP passwords, VAPID private keys
- Never expose `service_role` keys to browsers
- Parameterized queries only in data API

## Conventions for agents

- In-house first — read IN_HOUSE.md before adding dependencies
- Minimize scope; commits/pushes when user asks
- Update this handoff + SAVEPOINT.md on major milestones
- Production runs on VM; dev PC for code + `npm run dev`

## Related docs

- [README.md](./README.md)
- [SAVEPOINT.md](./SAVEPOINT.md)
- [infra/HOME_PC_SETUP.md](./infra/HOME_PC_SETUP.md)
- [infra/REMOTE_DEPLOY.md](./infra/REMOTE_DEPLOY.md)
- [.github/DEPLOY_FROM_GITHUB.md](./.github/DEPLOY_FROM_GITHUB.md)
- [docs/STACK.md](./docs/STACK.md)

## Last updated

2026-06-27 — v0.3.0-development: OAuth removed; remote deploy + home PC setup (`2ee9aae`).
