# White Lynx stack — SupaDupaBase + Timesheet

Open both repos in one Cursor window:

**File → Open Workspace from File →** `E:\White Lynx Projects\Cursor\whitelynx.code-workspace`

## Architecture (Option B — split VMs)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  https://timesheet.whitelynx.co.nz                               │
└───────────────┬─────────────────────────────┬─────────────────┘
                │ static PWA                    │ API (CORS)
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│  VM101 · 192.168.1.19     │     │  VM106 · 192.168.1.112        │
│  Timesheet App :5180      │     │  SupaDupaBase                 │
│  (timesheet-app Docker)   │     │  supadupabase.whitelynx.co.nz │
│                           │     │  auth · data-api · mail · db  │
│  Cloudflare Tunnel        │     │  Cloudflare Tunnel            │
└───────────────────────────┘     └───────────────────────────────┘
```

| URL | VM | Role |
|-----|-----|------|
| https://supadupabase.whitelynx.co.nz | VM106 | Auth, REST, mail, admin |
| https://timesheet.whitelynx.co.nz | VM101 | Timesheet PWA only |

Timesheet `config.js` points all `__SDB_*_URL` values at the VM106 public URL. The timesheet container does **not** proxy API traffic in production (`SDB_PROXY=0`).

## Local development

| Service | Command | URL |
|---------|---------|-----|
| SupaDupaBase | `cd supadupabase && npm run dev` | :3001 / :3002 / :3004 |
| Timesheet | `cd timesheet-app && npm run dev` | :5180 |

Timesheet `config.js` (repo default) uses `localhost:3001/3002/3004`.

## Deploy

| Repo | Host | Docs |
|------|------|------|
| SupaDupaBase | VM106 | [infra/DEPLOY_AT_HOME.md](../infra/DEPLOY_AT_HOME.md) |
| Timesheet | VM101 | `Timesheet App/infra/DEPLOY_VM101.md` |

After SupaDupaBase changes on VM106:

```bash
cd ~/supadupabase
git pull
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

After Timesheet changes on VM101:

```bash
cd /opt/timesheet-app
git pull
cp -r /path/to/sdk/dist/. sdk/   # or from dev PC before build
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
```

Copy SDK from SupaDupaBase when the client API changes:

```bash
cp -r supadupabase/packages/sdk/dist/. "Timeshhet App/sdk/"
```

## Database project

Timesheet uses SupaDupaBase project slug **`timesheet-app`** (migration `002_timesheet.sql`). Allowed origins must include `https://timesheet.whitelynx.co.nz`.
