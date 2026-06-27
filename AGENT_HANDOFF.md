# SupaDupaBase — Agent handoff

> **Read this first** when picking up work on this repository. Update this file when major decisions or milestones change.

## Project summary

**SupaDupaBase** is a custom, self-hosted alternative to Supabase for the owner's websites and PWAs. Greenfield Node/TypeScript monorepo with Postgres RLS, inspired by Supabase's security model and client ergonomics.

**Dependency philosophy:** **In-house first** — server runtime dep `pg` only. No Better Auth, Drizzle, Hono, React, or UI frameworks. See [docs/IN_HOUSE.md](./docs/IN_HOUSE.md).

**UI:** **Dark mode only** — **Cyan Hexagons** theme (tessellated flat-top honeycomb). See [docs/THEME.md](./docs/THEME.md).

**GitHub:** https://github.com/johngoodspeed77/supadupabase (`main`)

## Save point — v0.1.0-local-mvp (2026-06-27)

**Current stage:** Local dev MVP **complete**. Code on GitHub. VM/tunnel **not deployed**.

See [SAVEPOINT.md](./SAVEPOINT.md) for restore instructions and commit map.

### Completed

- [x] Monorepo scaffold (`packages/shared`, `server`, `db`, `ui`, `sdk`)
- [x] Auth service (email, Google OAuth, refresh, admin routes, API keys)
- [x] Data API (GET/POST/PATCH/DELETE, RLS on `profiles`)
- [x] Admin UI (projects, users, API keys — wired to admin API)
- [x] Sample PWA (signup, refresh, RLS profiles)
- [x] Local dev: `docker-compose.dev.yml`, `DEV.md`, `npm run dev`
- [x] Production infra **docs/config**: `docker-compose.yml`, Caddyfile, DEPLOY.md, PROXMOX.md
- [x] GitHub repository published

### Not started / deferred

- [ ] Proxmox VM provision
- [ ] Cloudflare Tunnel live
- [ ] Production Google OAuth + `.env` on VM
- [ ] Integration tests (RLS + JWT)
- [ ] Data API: RPC, anon/service key auth, more tables
- [ ] First real consumer site (sample PWA is reference only)

## Owner goals

- Central auth and user data for multiple sites/PWAs
- Full control on own hardware (Proxmox)
- Google login + email/password
- Remote access via Cloudflare Tunnel (no router port forwarding)
- Supabase-like DX (`createClient`, `.from('table').select()`)
- Minimal external dependencies

## Confirmed decisions

| Topic | Decision |
|-------|----------|
| Product name | **SupaDupaBase** |
| NPM package | `@supadupabase/sdk` |
| GitHub | `johngoodspeed77/supadupabase` |
| Dependencies | In-house first — server: `pg` only |
| Auth | scrypt + JWT; Google OAuth via `fetch` |
| Data API | `packages/server` on Node `http` |
| Migrations | Plain SQL + migration runner |
| Admin UI | Static HTML + Cyan Hexagons CSS + vanilla JS |
| SDK | Zero runtime deps; optional `authUrl` for local split ports |
| VM | New dedicated full VM on Proxmox (not busy shared VM) |
| VM specs | Ubuntu 24.04, 4 vCPU, 8 GB RAM, 40 GB disk |
| Public access | Cloudflare Tunnel → Caddy |
| Database | PostgreSQL 16 + RLS |
| Production domain | `supadupabase.whitelynx.co.nz` |

## Still open

- First production consumer PWA/site (beyond sample)
- License

## Repository structure

```
supadupabase/
  apps/
    auth-service/
    data-api/
    admin/
    sample-pwa/
  packages/
    server/, db/, sdk/, shared/, ui/
  docs/
    IN_HOUSE.md, THEME.md
  infra/
    docker-compose.yml, docker-compose.dev.yml
    Caddyfile, DEPLOY.md, PROXMOX.md, cloudflared/
  SAVEPOINT.md
```

## Next work (recommended order)

1. Provision Proxmox VM ([infra/PROXMOX.md](./infra/PROXMOX.md))
2. Deploy stack ([infra/DEPLOY.md](./infra/DEPLOY.md)) + tunnel token
3. Google OAuth production credentials
4. Create anon/service keys via admin; wire first real site
5. RLS integration tests

## Auth service contract (MVP)

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

Admin routes require `ADMIN_EMAILS` in `.env`.

## Data API contract (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/rest/v1/:table` | CRUD (`profiles` whitelisted) |
| POST | `/rest/v1/rpc/:function` | Not implemented (501) |

## Security rules (non-negotiable)

- Never commit `.env`, tunnel tokens, Google secrets
- Never expose `service_role` keys to browsers
- Parameterized queries only in data API
- No third-party auth/ORM/UI frameworks without owner approval

## Conventions for agents

- In-house first — read IN_HOUSE.md before adding dependencies
- Theme — Cyan Hexagons + tessellated honeycomb from THEME.md
- Minimize scope
- Commits/pushes only when the user asks
- Update this handoff + SAVEPOINT.md on major milestones

## Related docs

- [README.md](./README.md)
- [SAVEPOINT.md](./SAVEPOINT.md)
- [AGENTS.md](./AGENTS.md)
- [DEV.md](./DEV.md)
- [docs/IN_HOUSE.md](./docs/IN_HOUSE.md)
- [docs/THEME.md](./docs/THEME.md)

## Last updated

2026-06-27 — Save point v0.1.0-local-mvp; README/handoff synced; pushed to GitHub.
