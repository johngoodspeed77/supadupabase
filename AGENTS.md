# Agent instructions

For full project context, decisions, and implementation order, read **[AGENT_HANDOFF.md](./AGENT_HANDOFF.md)** first.

## Quick reference

- **Product:** SupaDupaBase — self-hosted auth + Postgres data API for websites/PWAs
- **Stage:** Planning done; code not started
- **Stack:** Node 22, TypeScript, pnpm monorepo, Better Auth, Hono, Drizzle, Postgres RLS, Docker, Caddy, Cloudflare Tunnel
- **Deploy:** New dedicated Proxmox full VM (not the existing shared VM)

## When implementing

1. Follow the implementation order in `AGENT_HANDOFF.md`
2. Never commit secrets (`.env`, tunnel tokens, OAuth credentials)
3. Never expose service-role API keys to client/browser code
4. Use parameterized queries only in the data API
5. Test RLS with real JWT contexts

## Key packages

| Path | Role |
|------|------|
| `apps/auth-service` | Email + Google auth, JWT |
| `apps/data-api` | REST CRUD with RLS |
| `apps/admin` | Admin dashboard |
| `packages/db` | Schema and migrations |
| `packages/sdk` | `@supadupabase/sdk` |
| `infra/` | Docker Compose, Caddy, cloudflared |
