# SupaDupaBase

Self-hosted backend for access control and user data storage — a Supabase-inspired platform you run on your own infrastructure.

Built **in-house** with minimal dependencies: custom auth, custom HTTP API, plain SQL migrations, and a zero-dep client SDK. Admin UI uses a **dark Cyan Hexagons** theme.

## Status

**Planning / early scaffold** — docs and repo layout; application code not yet implemented.

See [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) for architecture and [docs/IN_HOUSE.md](./docs/IN_HOUSE.md) for the dependency policy.

## What it provides

| Capability | Description |
|------------|-------------|
| Auth | In-house email/password + Google OAuth, JWT, sessions |
| Data API | In-house REST over Postgres with RLS per user |
| SDK | `@supadupabase/sdk` — fetch only, no runtime deps |
| Admin | Dark **Cyan Hexagons** dashboard (HTML + CSS + vanilla JS) |
| Deploy | Docker Compose on Proxmox, public via Cloudflare Tunnel |

## In-house stack

| Layer | Implementation |
|-------|----------------|
| HTTP | `packages/server` — Node `http` + tiny router |
| Auth | Scrypt (`node:crypto`) + JWT (`node:crypto` HMAC) |
| Google login | In-house OAuth code flow (`fetch` to Google) |
| Database | PostgreSQL 16 + plain SQL migrations |
| Server deps | **`pg` only** |
| Admin UI | `packages/ui` — Cyan Hexagons CSS, no React/Tailwind |
| SDK | Zero runtime dependencies |

## Architecture

```
PWA / Website → Cloudflare → cloudflared → Caddy → auth-service | data-api | admin → PostgreSQL
```

**Production URL:** `https://supadupabase.whitelynx.co.nz`

## Planned layout

```
supadupabase/
  apps/     auth-service, data-api, admin
  packages/ server, db, sdk, shared, ui
  docs/     IN_HOUSE.md, THEME.md
  infra/    docker-compose, Caddyfile
```

## Theme

Dark mode only. Cyan accents (`#22d3ee`) on charcoal backgrounds with a hexagon grid pattern. Details: [docs/THEME.md](./docs/THEME.md).

## Client usage (target)

```ts
import { createClient } from '@supadupabase/sdk'

const client = createClient({
  url: 'https://supadupabase.whitelynx.co.nz',
  anonKey: process.env.SUPADUPABASE_ANON_KEY!,
})

await client.auth.signInWithGoogle({ redirectTo: window.location.origin })
const { data } = await client.from('profiles').select('*')
```

## Google OAuth

Redirect URI: `https://supadupabase.whitelynx.co.nz/auth/callback/google`

Implemented in-house in the auth service — no third-party auth library.

## License

TBD
