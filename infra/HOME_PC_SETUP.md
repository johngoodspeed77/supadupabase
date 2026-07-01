# Home PC setup & deploy

Use this on your **home PC** (on the same LAN as the Proxmox VMs). Open Cursor at home, `git pull` both repos, then follow the steps below.

**Repos:** [supadupabase](https://github.com/johngoodspeed77/supadupabase) · [timesheet-app](https://github.com/johngoodspeed77/timesheet-app)

**Latest on GitHub (2026-07-01):** OAuth removed · remote deploy hooks · timesheet dirty-Save UI · VM101 hook OK · **VM106 hook needs fix (502)**

---

## Quick checklist — run when you get home

Copy-paste into home Cursor or a terminal:

```powershell
# 1. Pull latest on home PC (if using local clones)
cd supadupabase && git pull origin main
cd ../timesheet-app && git pull origin main

# 2. Deploy VM106 (SupaDupaBase)
ssh supadupabase@192.168.1.112 "cd ~/supadupabase && git pull origin main && chmod +x infra/deploy-quick.sh infra/enable-remote-deploy.sh && ./infra/deploy-quick.sh"

# 3. Fix VM106 deploy-hook (502) — skip if healthz already OK
ssh supadupabase@192.168.1.112 "cd ~/supadupabase && ./infra/enable-remote-deploy.sh && curl -fsS http://localhost/hooks/healthz"

# 4. Deploy VM101 (Timesheet — dirty Save UI, app.js v29)
ssh johngoodspeed@192.168.1.19 "cd /opt/timesheet-app && git pull origin main && chmod +x infra/deploy-quick.sh && DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build timesheet-app"
```

**Verify after deploy:**

```bash
curl -fsS https://supadupabase.whitelynx.co.nz/hooks/healthz    # expect 200
curl -fsS https://timesheet.whitelynx.co.nz/hooks/healthz         # expect 200
curl -fsS https://supadupabase.whitelynx.co.nz/auth/healthz       # expect ok
```

Open https://timesheet.whitelynx.co.nz → hard refresh (Ctrl+Shift+R). Confirm:
- No **Delete** button on daily rows
- **Save** only appears after you edit a day
- View source shows `app.js?v=29`, `styles.css?v=14`

**Optional — remote deploy from away PC later:** complete [section B](#b-one-time-enable-remote-deploy-deploy-from-anywhere-later) and add `DEPLOY_HOOK_SECRET` to GitHub Actions secrets.

---

## A. Deploy now (at home, no remote hooks)

SSH from home works even if deploy hooks are not set up yet.

### VM106 — SupaDupaBase

```bash
ssh supadupabase@192.168.1.112
cd ~/supadupabase
git pull origin main
chmod +x infra/deploy.sh infra/deploy-quick.sh
./infra/deploy-quick.sh
```

Or full deploy (migrations + tunnel):

```bash
./infra/deploy.sh
```

Verify:

```bash
curl -fsS https://supadupabase.whitelynx.co.nz/auth/healthz
```

### VM101 — Timesheet

```bash
ssh johngoodspeed@192.168.1.19
cd /opt/timesheet-app
git pull origin main
chmod +x infra/deploy-quick.sh
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build timesheet-app
```

Verify: open https://timesheet.whitelynx.co.nz and hard-refresh (Ctrl+Shift+R).

### One-liner from home PC (PowerShell)

```powershell
ssh supadupabase@192.168.1.112 "cd ~/supadupabase && git pull && chmod +x infra/deploy-quick.sh && ./infra/deploy-quick.sh"
ssh johngoodspeed@192.168.1.19 "cd /opt/timesheet-app && git pull && chmod +x infra/deploy-quick.sh && DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build timesheet-app"
```

---

## B. One-time: enable remote deploy (deploy from anywhere later)

Do this **once** at home so you can deploy from GitHub Actions or your away-from-home PC.

### 1. Generate a secret

```bash
openssl rand -base64 32
```

Save it somewhere safe. Use the **same value** everywhere below.

### 2. VM106

```bash
ssh supadupabase@192.168.1.112
cd ~/supadupabase
git pull origin main
chmod +x infra/enable-remote-deploy.sh infra/deploy-quick.sh
# Add to .env if not already there:
#   DEPLOY_HOOK_SECRET=<your-secret>
nano .env
./infra/enable-remote-deploy.sh
```

Check:

```bash
curl -fsS http://localhost/hooks/healthz
curl -fsS https://supadupabase.whitelynx.co.nz/hooks/healthz
```

### 3. VM101

```bash
ssh johngoodspeed@192.168.1.19
cd /opt/timesheet-app
git pull origin main
chmod +x infra/enable-remote-deploy.sh infra/deploy-quick.sh
# Add to infra/.env:
#   DEPLOY_HOOK_SECRET=<same-secret>
nano infra/.env
./infra/enable-remote-deploy.sh
```

Check:

```bash
curl -fsS http://localhost:5189/hooks/healthz
```

### 4. Cloudflare (VM101 tunnel dashboard)

Add a **path rule** on the `timesheet.whitelynx.co.nz` tunnel (before the catch-all PWA route):

| Path | Service |
|------|---------|
| `/hooks/*` | `http://localhost:5189` |

VM106 is already routed through Caddy (`/hooks/*` → deploy-hook).

### 5. GitHub Actions secret

In **supadupabase** repo: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|--------|
| `DEPLOY_HOOK_SECRET` | Your secret |

Optional (defaults work if hostnames match):

| Name | Value |
|------|--------|
| `DEPLOY_WEBHOOK_URL_VM106` | `https://supadupabase.whitelynx.co.nz/hooks/deploy` |
| `DEPLOY_WEBHOOK_URL_VM101` | `https://timesheet.whitelynx.co.nz/hooks/deploy` |

### 6. Dev PC `.env.remote` (optional)

On any machine you deploy from:

```bash
cp .env.remote.example .env.remote
# set DEPLOY_HOOK_SECRET
npm run deploy:remote
```

---

## C. Deploy from GitHub (after section B)

1. Open https://github.com/johngoodspeed77/supadupabase/actions/workflows/deploy.yml
2. **Run workflow**
3. Choose **target:** `both` (or `timesheet` / `supadupabase`)
4. Enable **migrate** only when SupaDupaBase DB migrations changed

---

## D. Ask Cursor at home

Paste into a new chat on the home PC:

> Pull latest supadupabase and timesheet-app from GitHub. SSH to VM106 (`supadupabase@192.168.1.112`) and VM101 (`johngoodspeed@192.168.1.19`) and deploy per `infra/HOME_PC_SETUP.md` section A. If `DEPLOY_HOOK_SECRET` is not in `.env` yet, run section B using `infra/enable-remote-deploy.sh` on both VMs.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SSH timeout from away PC | Normal — use home PC or GitHub Actions after hooks are enabled |
| `hooks/healthz` 404 or 502 | Run `enable-remote-deploy.sh` on that VM |
| Timesheet hook 404 publicly | Cloudflare path `/hooks/*` → port 5189 |
| Stale PWA after deploy | Hard refresh or ↻ Refresh on sign-in page |

See also: [REMOTE_DEPLOY.md](./REMOTE_DEPLOY.md)
