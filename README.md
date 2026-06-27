# SupaDupaBase

Self-hosted backend for access control and user data storage — a Supabase-inspired platform you run on your own infrastructure.

Use it from websites and PWAs via `@supadupabase/sdk`: email/password auth, Google sign-in, Postgres-backed data with row-level security (RLS), and project-scoped API keys.

## Status

**Planning / early scaffold** — repository and docs exist; application code not yet implemented.

See [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) for full architecture, decisions, and implementation order (for humans and AI agents).

## What it provides

| Capability | Description |
|------------|-------------|
| Auth | Email/password + Google OAuth, sessions, JWT, refresh tokens |
| Data API | REST CRUD over Postgres with RLS enforced per user |
| SDK | `@supadupabase/sdk` for web apps and PWAs |
| Admin | Dashboard for projects, users, and API keys |
| Deploy | Docker Compose on a dedicated Proxmox VM, public access via Cloudflare Tunnel |

## Architecture (high level)

```
PWA / Website → Cloudflare → cloudflared → Caddy → auth-service | data-api | admin → PostgreSQL
```

- **Auth service** — Better Auth, issues JWTs with `sub`, `role`, `project_id`
- **Data API** — Hono; verifies JWT, runs queries as the authenticated user; RLS applies in Postgres
- **Postgres** — source of truth; policies use `auth.uid()` pattern (Supabase-style)

## Planned monorepo layout

```
supadupabase/
  apps/
    auth-service/
    data-api/
    admin/
  packages/
    db/           # Drizzle schema, migrations, RLS SQL
    sdk/          # @supadupabase/sdk
    shared/
  infra/
    docker-compose.yml
    Caddyfile
```

## Infrastructure (decided)

- **Host**: New dedicated full VM on Proxmox (Ubuntu 24.04, 4 vCPU, 8 GB RAM, 40 GB disk)
- **Public access**: Cloudflare Tunnel (no router port forwarding)
- **Reverse proxy**: Caddy
- **Secrets**: `.env` on VM only — never committed

## Local development (once scaffolded)

```bash
cd supadupabase
pnpm install
docker compose -f infra/docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev
```

## Client usage (target API)

```ts
import { createClient } from '@supadupabase/sdk'

const client = createClient({
  url: 'https://supadupabase.whitelynx.co.nz',
  anonKey: process.env.SUPADUPABASE_ANON_KEY!,
})

await client.auth.signInWithGoogle({ redirectTo: window.location.origin })
const { data } = await client.from('profiles').select('*')
```

## Google OAuth setup

1. Google Cloud Console → OAuth 2.0 Web client
2. Redirect URI: `https://supadupabase.whitelynx.co.nz/auth/callback/google`
3. JavaScript origins: your PWA/site URLs + `http://localhost:5173` for dev
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in production `.env`

## Security principles

- Never expose **service-role** keys in browser code
- All data API queries must be parameterized — no raw SQL from clients
- RLS is the enforcement layer; test with real JWT contexts
- UFW on VM: no inbound 80/443 from WAN; tunnel only

## License

TBD
