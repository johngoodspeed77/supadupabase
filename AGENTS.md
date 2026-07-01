# Agent instructions

Read **[AGENT_HANDOFF.md](./AGENT_HANDOFF.md)** first.

## Non-negotiables

1. **In-house first** — [docs/IN_HOUSE.md](./docs/IN_HOUSE.md). Server runtime dep: `pg` only. No Better Auth, Drizzle, Hono, React, Tailwind.
2. **Cyan Hexagons theme** — [docs/THEME.md](./docs/THEME.md) for admin and first-party UI. Dark mode only.
3. **Never** commit secrets or expose service-role keys to browsers.
4. **Parameterized queries only** in the data API.

## Key packages

| Path | Role |
|------|------|
| `docs/STACK.md` | Option B architecture + one-Cursor workflow |
| `packages/server` | In-house HTTP router |
| `packages/shared` | JWT, scrypt, types |
| `packages/db` | SQL migrations |
| `packages/ui` | Cyan Hexagons CSS |
| `packages/sdk` | `@supadupabase/sdk` |
| `apps/auth-service` | Auth (email/password, invites) |
| `apps/data-api` | REST + RLS |
| `apps/mail-service` | SMTP, timesheet email, push, admin mail test |
| `apps/deploy-hook` | Remote HTTPS deploy webhook (VM106) |
| `apps/admin` | Static admin UI |
