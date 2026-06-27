# SupaDupaBase

Self-hosted backend for access control and user data storage — a Supabase-inspired platform you run on your own infrastructure.

Built **in-house** with minimal dependencies: custom auth, custom HTTP API, plain SQL migrations, and a zero-dep client SDK. Admin UI uses a **dark Cyan Hexagons** theme with a tessellated honeycomb background.

**Repository:** https://github.com/johngoodspeed77/supadupabase

## Status

**Save point `v0.1.0-local-mvp`** (2026-06-27) — local dev MVP complete; production VM not deployed yet.

| Done | Pending |
|------|---------|
| Auth, data API, SDK, admin, sample PWA | Proxmox VM + Cloudflare Tunnel |
| SQL migrations + RLS on `profiles` | Live `supadupabase.whitelynx.co.nz` |
| Production Docker/Caddy docs in `infra/` | Integration tests, RPC, key auth on data API |

Details: [SAVEPOINT.md](./SAVEPOINT.md) · Local start: [DEV.md](./DEV.md) · Architecture: [AGENT_HANDOFF.md](./AGENT_HANDOFF.md)

## Quick start (local)

```bash
git clone https://github.com/johngoodspeed77/supadupabase.git
cd supadupabase
npm install && npm run build
cp .env.example .env   # set ADMIN_EMAILS and AUTH_SECRET
docker compose -f infra/docker-compose.dev.yml up -d
npm run migrate
npm run dev
```

| Service | URL |
|---------|-----|
| Auth | http://localhost:3001 |
| Data API | http://localhost:3002 |
| Admin | http://localhost:3003 |
| Sample PWA | http://localhost:5173 |

## What it provides

| Capability | Description |
|------------|-------------|
| Auth | In-house email/password + Google OAuth, JWT, sessions |
| Data API | REST over Postgres with RLS per user |
| SDK | `@supadupabase/sdk` — zero runtime deps |
| Admin | Cyan Hexagons dashboard (HTML + CSS + vanilla JS) |
| Deploy | Docker Compose + Caddy + Cloudflare Tunnel (documented) |

## In-house stack

| Layer | Implementation |
|-------|----------------|
| HTTP | `packages/server` — Node `http` + tiny router |
| Auth | `node:crypto` scrypt + HMAC JWT |
| Google login | In-house OAuth (`fetch` to Google) |
| Database | PostgreSQL 16 + plain SQL migrations |
| Server deps | **`pg` only** |
| Admin UI | `packages/ui` — no React/Tailwind |

## Production

- **Domain:** `https://supadupabase.whitelynx.co.nz`
- **OAuth redirect:** `https://supadupabase.whitelynx.co.nz/auth/callback/google`
- **Deploy:** [infra/DEPLOY.md](./infra/DEPLOY.md) · [infra/PROXMOX.md](./infra/PROXMOX.md)

## Client usage

```ts
import { createClient } from '@supadupabase/sdk'

const client = createClient({
  url: 'https://supadupabase.whitelynx.co.nz',
  authUrl: 'https://supadupabase.whitelynx.co.nz', // same host behind Caddy in prod
  anonKey: process.env.SUPADUPABASE_ANON_KEY!,
})

await client.auth.signInWithGoogle({ redirectTo: window.location.origin })
const { data } = await client.from('profiles').select('*')
```

## Theme

Dark mode only — cyan accents (`#22d3ee`) on charcoal with tessellated honeycomb tile. See [docs/THEME.md](./docs/THEME.md).

## License

TBD
