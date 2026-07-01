# SupaDupaBase — in-house dependency policy

SupaDupaBase is built to run with **minimal external application dependencies**. Prefer code we own in this monorepo over third-party frameworks and platforms.

## What “in-house” means

| Build ourselves | Accept only when impractical to replace |
|-----------------|----------------------------------------|
| Auth (email, JWT, sessions) | PostgreSQL (database engine) |
| HTTP routing and request handling | `pg` (Postgres wire protocol client) |
| Data API (REST, query builder, RLS context) | Node.js runtime |
| SQL migrations (plain `.sql` files) | OS packages on VM (Docker, Caddy, cloudflared) |
| `@supadupabase/sdk` (fetch-based) | Cloudflare Tunnel (network path to your VM) |
| Password hashing via `node:crypto` scrypt | |
| JWT sign/verify via `node:crypto` HMAC | |
| Admin UI (HTML + CSS + vanilla JS) | |

## Explicitly excluded (do not add without owner approval)

- Auth libraries: Better Auth, Passport, Auth0, Clerk, Supabase Auth, Firebase Auth
- ORMs: Drizzle, Prisma, TypeORM, Knex query builder
- HTTP frameworks: Hono, Express, Fastify, Koa
- UI frameworks: React, Vue, Angular, Tailwind, MUI, shadcn
- Heavy client libs: axios, lodash (use native `fetch`, `structuredClone`, etc.)

## Allowed runtime dependencies (target lockfile)

**Server (`apps/auth-service`, `apps/data-api`):**

- `pg` — Postgres driver only

**Dev only:**

- `typescript`, `@types/node`, `@types/pg`
- Test runner if/when tests are added (prefer `node:test` built-in first)

**Zero-dep packages:**

- `packages/shared` — types, JWT helpers using `crypto`
- `packages/sdk` — `fetch` only, no runtime deps
- `packages/ui` — CSS only
- `packages/db` — SQL files + small migration runner script (Node + `pg`)

## In-house modules (monorepo)

```
packages/
  shared/     # JWT, errors, crypto helpers, HTTP types
  server/     # Tiny router, middleware, JSON body parser (Node http)
  db/         # SQL migrations, migration runner
  sdk/        # Client for sites/PWAs
  ui/         # Cyan Hexagons theme (see THEME.md)
```

## When to reconsider

Add a dependency only if:

1. Security-critical and hard to get right (document why in AGENT_HANDOFF), or
2. Owner explicitly approves

Default answer: **implement in-house**.
