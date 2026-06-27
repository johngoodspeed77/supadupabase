# SupaDupaBase — Agent handoff

> **Read this first** when picking up work on this repository. Update this file when major decisions or milestones change.

## Project summary

**SupaDupaBase** is a custom, self-hosted alternative to Supabase for the owner's websites and PWAs. Greenfield Node/TypeScript monorepo with Postgres RLS, inspired by Supabase's security model and client ergonomics.

**Dependency philosophy:** **In-house first** — minimal npm runtime deps (`pg` only on server). No Better Auth, Drizzle, Hono, React, or UI frameworks. See [docs/IN_HOUSE.md](./docs/IN_HOUSE.md).

**UI:** **Dark mode only** — **Cyan Hexagons** theme for admin and first-party pages. See [docs/THEME.md](./docs/THEME.md).

**Current stage:** Planning complete; repo scaffold + docs. **No application code yet.**

## Owner goals

- Central auth and user data for multiple sites/PWAs
- Full control on own hardware (Proxmox)
- Google login + email/password
- Remote access without opening router ports (Cloudflare Tunnel)
- Supabase-like developer experience (`createClient`, `.from('table').select()`)
- **Minimal external dependencies** — build and own the stack

## Confirmed decisions

| Topic | Decision |
|-------|----------|
| Product name | **SupaDupaBase** |
| NPM package | `@supadupabase/sdk` |
| Repo folder | `supadupabase/` |
| Platform type | Custom build (not self-hosted Supabase stack) |
| **Dependencies** | **In-house first** — server runtime: `pg` only; see IN_HOUSE.md |
| **Auth** | In-house service — `node:crypto` scrypt + JWT; Google OAuth via direct `fetch` (no auth lib) |
| **Data API** | In-house HTTP server (`packages/server` router on Node `http`) |
| **Migrations** | Plain SQL files + small migration runner (no ORM) |
| **Admin UI** | Static HTML + in-house CSS (**Cyan Hexagons** dark theme) + vanilla JS |
| **SDK** | `fetch`-only, zero runtime dependencies |
| VM | **New dedicated full VM** on Proxmox — not the existing busy shared VM |
| VM specs | Ubuntu 24.04, 4 vCPU, 8 GB RAM, 40 GB disk, static LAN IP |
| Public access | **Cloudflare Tunnel** → Caddy (no WAN port forwarding) |
| Database | PostgreSQL 16 + **RLS** |
| Monorepo | npm workspaces (or pnpm — tooling only, not shipped) |
| Production domain | `supadupabase.whitelynx.co.nz` |

## Still open

- First consumer PWA/site (drives CORS and seed project)
- License

## Repository structure (target)

```
supadupabase/
  apps/
    auth-service/     # In-house auth, Google OAuth, JWT, API keys
    data-api/         # In-house REST, RLS context per request
    admin/            # Static admin (Cyan Hexagons theme)
  packages/
    server/           # Tiny HTTP router + middleware
    db/               # SQL migrations, migration runner
    sdk/              # @supadupabase/sdk (zero deps)
    shared/           # JWT, crypto, types, errors
    ui/               # theme.css, components.css (Cyan Hexagons)
  docs/
    IN_HOUSE.md
    THEME.md
  infra/
    docker-compose.yml
    Caddyfile
    cloudflared/
```

## Implementation order

1. **Scaffold monorepo** — TypeScript, workspaces, shared configs
2. **`packages/shared`** — JWT (HMAC), scrypt password helpers, types
3. **`packages/server`** — minimal router, JSON parser, CORS middleware
4. **`packages/db`** — SQL schema, migrations, `auth.uid()`, RLS policies, migration runner
5. **`packages/ui`** — Cyan Hexagons `theme.css` + components
6. **`apps/auth-service`** — email auth, Google OAuth (in-house), sessions, JWT
7. **`apps/data-api`** — JWT verify, Postgres context, parameterized CRUD
8. **`packages/sdk`** — `createClient`, auth, `from().select/...`
9. **`apps/admin`** — static shell using `packages/ui`, projects/users/keys views
10. **`infra/`** — Docker Compose, Caddy, cloudflared
11. **Proxmox VM** + tunnel for `supadupabase.whitelynx.co.nz`
12. **Sample PWA** — email + Google login, RLS-scoped data

## Auth service contract (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Email registration |
| POST | `/auth/login` | Email login |
| POST | `/auth/logout` | End session |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Current user |
| GET | `/auth/signin/google` | Redirect to Google (in-house OAuth start) |
| GET | `/auth/callback/google` | In-house token exchange + session |
| POST | `/auth/api-keys` | Create service key (server only) |

**Account linking:** same email via Google and password → one user row (match on email at callback).

## Data API contract (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/rest/v1/:table` | Table CRUD (`select`, `filter`, `order`, `limit`) |
| POST | `/rest/v1/rpc/:function` | Stored procedures (later) |

Flow: verify JWT → set Postgres session claims → parameterized query → RLS enforces.

## Security rules (non-negotiable)

- **Never** commit `.env`, tunnel tokens, Google secrets, or origin certs
- **Never** expose `service_role` keys to browser/PWA clients
- **Always** use parameterized queries (`pg` prepared statements)
- **Always** test RLS with integration tests using real JWT contexts
- **Do not** add third-party auth/ORM/UI frameworks without owner approval
- **Do not** build a full PostgREST clone or visual SQL editor in v1

## Infrastructure notes

- Existing busy Proxmox VM unchanged — platform gets its own VM
- UFW: SSH from LAN; no inbound 80/443 from WAN
- CORS: per-project allowed origins in `projects` table
- Backups: nightly `pg_dump` (Phase 3)

## Phase 2+ (defer unless asked)

- Admin: RLS policy viewer
- PWA offline refresh, rate limiting, observability
- In-house file storage, realtime, edge functions
- More OAuth providers (same in-house pattern as Google)

## Conventions for agents

- **In-house first** — read IN_HOUSE.md before adding any dependency
- **Theme** — admin and first-party UI use Cyan Hexagons tokens from THEME.md
- **Minimize scope** — small focused diffs
- **No commits/pushes** unless the user explicitly asks
- Update this handoff when architecture or phase status changes

## Related docs

- [README.md](./README.md)
- [AGENTS.md](./AGENTS.md)
- [docs/IN_HOUSE.md](./docs/IN_HOUSE.md)
- [docs/THEME.md](./docs/THEME.md)

## Last updated

2026-06-27 — In-house dependency policy + Cyan Hexagons dark theme confirmed.
