# Deploy from GitHub

## At home (LAN) — fastest

Follow **[infra/HOME_PC_SETUP.md](../infra/HOME_PC_SETUP.md)** section **A** — SSH to VMs and `git pull` + deploy scripts.

No GitHub Actions or secrets required.

---

## From anywhere — GitHub Actions

**Requires one-time setup:** [infra/HOME_PC_SETUP.md](../infra/HOME_PC_SETUP.md) section **B** (deploy hooks on VM106 + VM101).

### 1. Add repository secret

**Settings → Secrets and variables → Actions:**

| Secret | Required |
|--------|----------|
| `DEPLOY_HOOK_SECRET` | Yes — same value as in VM `.env` files |

### 2. Run workflow

1. Go to **Actions** → **Remote deploy**
2. **Run workflow**
3. Pick target: `supadupabase` | `timesheet` | `both`
4. Check **migrate** only when SQL migrations changed on SupaDupaBase

Workflow file: [.github/workflows/deploy.yml](./workflows/deploy.yml)

### 3. What it does

Sends `POST /hooks/deploy` to your public URLs. Each VM pulls `origin/main` and rebuilds Docker containers.

---

## Current pending deploys (example)

After pulling this doc, deploy latest timesheet UI (`Save` button changes):

- **Workflow target:** `timesheet`
- Or home LAN: `git pull` on VM101 and rebuild (see HOME_PC_SETUP.md)
