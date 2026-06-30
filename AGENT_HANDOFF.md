# SupaDupaBase — Agent handoff

> **Read this first** when picking up work on this repository. Update this file when major decisions or milestones change.

## Project summary

**SupaDupaBase** is a custom, self-hosted alternative to Supabase for the owner's websites and PWAs. Greenfield Node/TypeScript monorepo with Postgres RLS, inspired by Supabase's security model and client ergonomics.

**Dependency philosophy:** **In-house first** — server runtime dep `pg` only on core services. No Better Auth, Drizzle, Hono, React, or UI frameworks. See [docs/IN_HOUSE.md](./docs/IN_HOUSE.md). *Exception:* `mail-service` uses `web-push` for PWA reminders (owner-approved direction).

**UI:** **Dark mode only** — **Cyan Hexagons** theme (solid black background). See [docs/THEME.md](./docs/THEME.md).

**GitHub:** https://github.com/johngoodspeed77/supadupabase (`main`)

## Save point — v0.2.2-production (2026-06-30)

**Current stage:** **Production live** on VM106; Timesheet PWA live on VM101 (invite-only, **v0.3.1-production** integration). See [SAVEPOINT.md](./SAVEPOINT.md).

**Public:** https://supadupabase.whitelynx.co.nz  
**VM:** `supadupabase@192.168.1.112` · compose at `~/supadupabase`  
**Timesheet (consumer):** https://timesheet.whitelynx.co.nz on VM101 — see [docs/STACK.md](./docs/STACK.md)

**One Cursor workspace:** `E:\White Lynx Projects\Cursor\whitelynx.code-workspace` (SupaDupaBase + Timesheet App)

### Completed

- [x] Monorepo scaffold (`packages/shared`, `server`, `db`, `ui`, `sdk`)
- [x] Auth service (email, Google OAuth, refresh, admin routes, API keys, **`INVITE_ONLY`**)
- [x] Data API (GET/POST/PATCH/DELETE, RLS, **per-user row scoping**)
- [x] Admin UI (projects, **Users** invite/ban, API keys, **Emails** test page)
- [x] Timesheet schema/migrations (`002`–`009`)
- [x] **mail-service** — SMTP, timesheet submit (leave rows, employee **From** / **Reply-To**, **Fuzed Group** title), invite email, Web Push API
- [x] Proxmox VM106 + VM101 Timesheet (Option B)
- [x] Cloudflare Tunnel → Caddy → services
- [x] Gmail SMTP on VM106
- [x] Admin auth path fix behind `/admin` reverse proxy
- [x] Local dev: `docker-compose.dev.yml`, `DEV.md`, `npm run dev`

### In progress / deferred

- [ ] Data API: RPC, anon/service key auth on `/rest`
- [ ] Admin: create projects from UI; dynamic table whitelist
- [ ] Auth: verification + password-reset emails
- [ ] Google OAuth for timesheet origin (optional while invite-only)
- [ ] Weekly push reminder cron fully verified in prod
- [ ] Integration tests (RLS + JWT)
- [ ] License

## Owner goals

- Central auth and user data for multiple sites/PWAs
- Full control on own hardware (Proxmox)
- Google login + email/password
- Remote access via Cloudflare Tunnel (no router port forwarding)
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
| Auth | scrypt + JWT; Google OAuth via `fetch` |
| Data API | `packages/server` on Node `http` |
| Migrations | Plain SQL + migration runner |
| Admin UI | Static HTML + Cyan Hexagons CSS + vanilla JS |
| SDK | Zero runtime deps; optional `authUrl` for local split ports |
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
    mail-service/      # SMTP, timesheet email, push, admin mail test
    sample-pwa/
  packages/
    server/, db/, sdk/, shared/, ui/
  docs/
    IN_HOUSE.md, THEME.md
  infra/
    docker-compose.yml, docker-compose.dev.yml
    Caddyfile, DEPLOY.md, DEPLOY_AT_HOME.md, PROXMOX.md
  SAVEPOINT.md
```

## Next work (recommended order)

1. **Bug-fix pass** — work through [SAVEPOINT.md](./SAVEPOINT.md) known bugs list
2. `git pull` on VM + full rebuild + `migrate` profile
3. Verify Emails test send end-to-end in admin
4. Google OAuth production credentials
5. Wire Timesheet PWA to production API
6. anon/service key auth on data API
7. RLS integration tests

## Auth service contract

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Email registration |
| POST | `/auth/login` | Email login |
| POST | `/auth/logout` | End session |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Current user |
| GET | `/auth/signin/google` | Start Google OAuth |
| GET | `/auth/callback/google` | OAuth callback |
| POST | `/auth/api-keys` | Create API key (admin) |
| GET | `/admin/projects` | List projects (admin) |
| GET | `/admin/users` | List users (admin) |
| GET | `/admin/api-keys` | List keys (admin) |

Admin routes require bearer JWT + email in `ADMIN_EMAILS`.

## Mail service contract

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/mail/healthz` | Health |
| GET | `/admin/mail/status` | SMTP configured? (admin) |
| POST | `/admin/mail/test` | Send test email `{ to }` (admin) |
| POST | `/mail/timesheet/submit` | Email weekly timesheet to boss (`From` employee, `Reply-To` user, Fuzed Group template) |
| GET | `/mail/push/vapid-public-key` | VAPID public key |
| POST | `/mail/push/subscribe` | Save push subscription |
| POST | `/mail/push/unsubscribe` | Remove subscription |

Caddy routes `/admin/mail/*` → mail-service. `ADMIN_EMAILS` must be set on mail-service container.

## Data API contract

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/rest/v1/:table` | CRUD (whitelisted tables, JWT only) |
| POST | `/rest/v1/rpc/:function` | Not implemented (501) |

**Whitelisted tables:** `profiles`, `user_settings`, `time_entries`, `week_submissions` (see `apps/data-api/src/config.ts`).

## Security rules (non-negotiable)

- Never commit `.env`, tunnel tokens, Google secrets, SMTP passwords, VAPID private keys
- Never expose `service_role` keys to browsers
- Parameterized queries only in data API
- No third-party auth/ORM/UI frameworks without owner approval

## Conventions for agents

- In-house first — read IN_HOUSE.md before adding dependencies
- Theme — Cyan Hexagons + tessellated honeycomb from THEME.md
- Minimize scope
- Commits/pushes only when the user asks
- Update this handoff + SAVEPOINT.md on major milestones
- Production runs **only on the VM**; dev PC is for code + `npm run dev`

## Related docs

- [README.md](./README.md)
- [SAVEPOINT.md](./SAVEPOINT.md)
- [AGENTS.md](./AGENTS.md)
- [DEV.md](./DEV.md)
- [infra/DEPLOY_AT_HOME.md](./infra/DEPLOY_AT_HOME.md)
- [docs/STACK.md](./docs/STACK.md)
- [docs/IN_HOUSE.md](./docs/IN_HOUSE.md)
- [docs/THEME.md](./docs/THEME.md)

## Last updated

2026-06-30 — Save point v0.2.2-production: migration 009 leave entries; timesheet email From employee + Fuzed Group branding (`92c1e2b`, `fe60026`).
