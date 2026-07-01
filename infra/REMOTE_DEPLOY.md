# Remote deploy (away from home LAN)

Deploy to your Proxmox VMs over the **public internet** using HTTPS webhooks through your existing **Cloudflare Tunnels**. No VPN or home LAN required after one-time setup.

## How it works

```
Dev PC / GitHub Actions
        │  HTTPS POST + Bearer token
        ▼
Cloudflare Tunnel ──► Caddy ──► deploy-hook ──► git pull + docker compose
```

| VM | Public URL | Hook path |
|----|------------|-----------|
| VM106 SupaDupaBase | `https://supadupabase.whitelynx.co.nz` | `POST /hooks/deploy` |
| VM101 Timesheet | `https://timesheet.whitelynx.co.nz` | `POST /hooks/deploy` |

The hook runs `infra/deploy-quick.sh` on the VM: fast-forward `origin/main`, rebuild containers, optional migrations.

## One-time setup (do this once at home)

### 1. Generate a shared secret

```bash
openssl rand -base64 32
```

Add to **both** VM `.env` files:

```env
DEPLOY_HOOK_SECRET=<paste-secret-here>
```

VM106: `~/supadupabase/.env`  
VM101: `/opt/timesheet-app/infra/.env`

### 2. Enable deploy-hook on VM106

```bash
ssh supadupabase@192.168.1.112
cd ~/supadupabase
git pull
chmod +x infra/deploy-quick.sh infra/deploy.sh
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file .env --profile remote up -d --build deploy-hook caddy
curl -fsS http://localhost/hooks/healthz
```

Public check (from any network):

```bash
curl -fsS https://supadupabase.whitelynx.co.nz/hooks/healthz
```

### 3. Enable deploy-hook on VM101

```bash
ssh johngoodspeed@192.168.1.19
cd /opt/timesheet-app
git pull
chmod +x infra/deploy-quick.sh
DOCKER_BUILDKIT=0 docker compose -f infra/docker-compose.yml --env-file infra/.env --profile remote up -d --build deploy-hook timesheet-app
curl -fsS http://localhost:5189/hooks/healthz
```

**Cloudflare tunnel for VM101:** add a public hostname route:

- **Hostname:** `timesheet.whitelynx.co.nz`
- **Path:** `/hooks/*` → `http://localhost:5189` (or `http://192.168.1.19:5189`)

If your tunnel currently sends all traffic to `:5180`, add a **path rule** so `/hooks/*` goes to the deploy-hook port before the catch-all PWA route.

### 4. (Recommended) Cloudflare Access

In **Zero Trust → Access → Applications**, protect:

- `supadupabase.whitelynx.co.nz/hooks/*`
- `timesheet.whitelynx.co.nz/hooks/*`

Policy: allow only your email. The deploy hook **still requires** `DEPLOY_HOOK_SECRET` — Access adds a second layer.

### 5. Dev PC config

```bash
cp .env.remote.example .env.remote
# edit DEPLOY_HOOK_SECRET
```

### 6. GitHub Actions (optional)

Repo **Settings → Secrets → Actions**:

| Secret | Value |
|--------|--------|
| `DEPLOY_HOOK_SECRET` | Same secret as VMs |
| `DEPLOY_WEBHOOK_URL_VM106` | `https://supadupabase.whitelynx.co.nz/hooks/deploy` (optional) |
| `DEPLOY_WEBHOOK_URL_VM101` | `https://timesheet.whitelynx.co.nz/hooks/deploy` (optional) |

Then: **Actions → Remote deploy → Run workflow**.

## Deploy from anywhere

### npm (SupaDupaBase repo)

```bash
# SupaDupaBase only
npm run deploy:remote

# Both VMs
node scripts/remote-deploy.mjs --target both

# With migrations
node scripts/remote-deploy.mjs --target supadupabase --migrate
```

### PowerShell (Windows)

```powershell
.\scripts\remote-deploy.ps1 -Target both
.\scripts\remote-deploy.ps1 -Target supadupabase -Migrate
```

### curl

```bash
curl -X POST https://supadupabase.whitelynx.co.nz/hooks/deploy \
  -H "Authorization: Bearer $DEPLOY_HOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"services":"auth-service admin"}'
```

## Security notes

- Use a long random `DEPLOY_HOOK_SECRET` (32+ bytes).
- Never commit `.env.remote` or the VM secret.
- The deploy-hook container mounts the Docker socket — only enable on your own VMs.
- Rotate the secret if it is ever exposed.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 Unauthorized` | Wrong `DEPLOY_HOOK_SECRET` |
| `503 deploy_disabled` | Secret not set in VM `.env` or deploy-hook not running |
| `502` on `/hooks/*` | `docker compose --profile remote up -d deploy-hook` |
| VM101 hook unreachable | Add Cloudflare path route for `/hooks/*` → port `5189` |
| `deploy_busy` | Wait for current deploy to finish |

## Related

- [DEPLOY_AT_HOME.md](./DEPLOY_AT_HOME.md) — full VM deploy
- [docs/STACK.md](../docs/STACK.md) — VM106 + VM101 architecture
