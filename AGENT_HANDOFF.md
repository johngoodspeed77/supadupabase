# SupaDupaBase — Agent handoff

> **Read this first** when picking up work on this repository. Update this file when major decisions or milestones change.

## Project summary

**SupaDupaBase** is a custom, self-hosted alternative to Supabase for the owner's websites and PWAs. It is **not** a fork of Supabase OSS — it is a greenfield Node/TypeScript monorepo with Postgres RLS, inspired by Supabase's security model and client ergonomics.

**Current stage:** Planning complete; repo scaffold (README, this file) only. **No application code yet.**

## Owner goals

- Central auth and user data for multiple sites/PWAs
- Full control on own hardware (Proxmox)
- Google login + email/password
- Remote access without opening router ports (Cloudflare Tunnel)
- Supabase-like developer experience (`createClient`, `.from('table').select()`)

## Confirmed decisions

| Topic | Decision |
|-------|----------|
| Product name | **SupaDupaBase** |
| NPM package | `@supadupabase/sdk` |
| Repo folder | `supadupabase/` |
| Platform type | Custom build (not self-hosted Supabase stack) |
| VM | **New dedicated full VM** on Proxmox — do **not** use the existing busy shared VM |
| VM specs | Ubuntu 24.04, 4 vCPU, 8 GB RAM, 40 GB disk, static LAN IP |
| Public access | **Cloudflare Tunnel** → Caddy (no WAN port forwarding) |
| Auth | Better Auth — email/password + **Google OAuth** in MVP |
| Database | PostgreSQL 16 + Drizzle migrations + **RLS** |
| Data API | Hono — REST `/rest/v1/:table`, JWT → per-request DB context |
| Admin UI | React + Vite (minimal MVP: projects, users, API keys) |
| Monorepo | pnpm workspaces |
| Production domain | `supadupabase.whitelynx.co.nz` — Cloudflare Tunnel → Caddy; `PUBLIC_URL` / JWT issuer / OAuth callback base |

## Still open

- First consumer PWA/site (drives CORS and seed project)
- License

## Repository structure (target)

```
supadupabase/
  apps/
    auth-service/     # Better Auth, Google OAuth, JWT, API keys
    data-api/         # Hono REST, RLS context per request
    admin/            # SupaDupaBase admin dashboard
  packages/
    db/               # Drizzle schema, migrations, auth.uid(), RLS SQL
    sdk/              # @supadupabase/sdk
    shared/           # JWT claims, types, error codes
  infra/
    docker-compose.yml
    docker-compose.dev.yml
    Caddyfile
    cloudflared/      # config templates only; tokens NOT in git
```

## Implementation order

Execute in this sequence unless the user reprioritizes:

1. **Scaffold monorepo** — pnpm, TypeScript, shared configs
2. **`packages/db`** — schema (`projects`, `users`, `sessions`, `api_keys`, `profiles`), `auth.uid()`, example RLS policies, migrations
3. **`apps/auth-service`** — signup, login, logout, refresh, Google OAuth, JWT claims (`sub`, `role`, `project_id`, `exp`)
4. **`apps/data-api`** — verify JWT, set Postgres session context, CRUD with parameterized queries only
5. **`packages/sdk`** — `createClient`, `signInWithGoogle`, `signInWithPassword`, `from().select/insert/update/delete`
6. **`infra/`** — Docker Compose, Caddy, cloudflared service, `.env.example`
7. **`apps/admin`** — minimal dashboard
8. **Proxmox VM** — provision VM, deploy stack, configure tunnel
9. **Sample PWA** — prove email + Google login, session refresh, RLS-scoped reads/writes

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
| POST | `/auth/api-keys` | Create service key (server only) |

Enable **account linking** in Better Auth so the same email via Google and password does not create duplicate users.

## Data API contract (MVP)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/rest/v1/:table` | Table CRUD (`select`, `filter`, `order`, `limit` query params) |
| POST | `/rest/v1/rpc/:function` | Stored procedures (later) |

Flow: verify JWT → `SET LOCAL` JWT claims or equivalent → query → RLS enforces access.

## Security rules (non-negotiable)

- **Never** commit `.env`, tunnel tokens, Google secrets, or origin certs
- **Never** expose `service_role` keys to browser/PWA clients
- **Always** use parameterized queries in the data API
- **Always** test RLS with integration tests using real JWT contexts
- **Do not** build a full PostgREST clone or visual SQL editor in v1

## Infrastructure notes

- Existing Proxmox VM (10 vCPU, 30 GB RAM, RTX 3060) stays for other workloads — **platform gets its own VM**
- UFW: SSH from LAN only; no inbound 80/443 from WAN
- CORS: per-project allowed origins in `projects` table
- Backups: plan nightly `pg_dump` to Proxmox storage (Phase 3)

## Phase 2+ (defer unless asked)

- Admin: RLS policy viewer/editor
- PWA offline token refresh, rate limiting, observability
- MinIO storage, Realtime (LISTEN/NOTIFY), edge functions
- Additional OAuth: GitHub, Apple

## Local dev commands (once scaffold exists)

```bash
cd supadupabase
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev
```

## Conventions for agents

- **Minimize scope** — small focused diffs; match existing patterns
- **No commits** unless the user explicitly asks
- **No pushes** unless the user explicitly asks
- Prefer extending existing packages over new abstractions
- Update this handoff when architecture or phase status changes

## Related docs

- [README.md](./README.md) — human-facing overview
- [AGENTS.md](./AGENTS.md) — Cursor agent rules pointer
- Plan file (Cursor): `custom_auth_data_platform_91d99692.plan.md`

## Last updated

2026-06-27 — Production domain confirmed (`supadupabase.whitelynx.co.nz`); planning stage, repo scaffold only.
