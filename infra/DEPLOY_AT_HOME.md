# Deploy at home — checklist

Use this when you're at the Proxmox host. **Do not deploy on your dev PC** — only on the new dedicated VM.

## Before you start

- [ ] New Ubuntu 24.04 VM created ([PROXMOX.md](./PROXMOX.md))
- [ ] Static LAN IP on the VM
- [ ] Docker + Docker Compose installed on the VM
- [ ] Cloudflare DNS for `supadupabase.whitelynx.co.nz`
- [ ] Cloudflare Tunnel created (Zero Trust → Networks → Tunnels)

## 1. Clone on the VM

```bash
sudo mkdir -p /opt/supadupabase
sudo chown $USER:$USER /opt/supadupabase
git clone https://github.com/johngoodspeed77/supadupabase.git /opt/supadupabase
cd /opt/supadupabase
```

## 2. Configure `.env`

```bash
cp infra/env.production.example .env
nano .env
```

| Variable | What to set |
|----------|-------------|
| `POSTGRES_PASSWORD` | Strong random password |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Your email (comma-separated for multiple admins) |
| `TUNNEL_TOKEN` | From Cloudflare tunnel setup |

Leave `JWT_ISSUER` and `PUBLIC_URL` as `https://supadupabase.whitelynx.co.nz`.

## 3. Cloudflare Tunnel routing

In the Cloudflare tunnel config, add a public hostname:

- **Hostname:** `supadupabase.whitelynx.co.nz`
- **Service:** `http://caddy:80` (Docker internal — cloudflared runs in same compose network)

Paste the tunnel token into `TUNNEL_TOKEN` in `.env`.

## 4. Deploy

```bash
chmod +x infra/deploy.sh
./infra/deploy.sh
```

This builds images, starts Postgres + auth + data-api + admin + Caddy, runs migrations, and starts cloudflared if `TUNNEL_TOKEN` is set.

## 5. Verify

**Through the tunnel (public):**

```bash
curl https://supadupabase.whitelynx.co.nz/auth/healthz
curl https://supadupabase.whitelynx.co.nz/rest/healthz
```

**On the VM (LAN):**

```bash
curl http://localhost/auth/healthz
curl http://localhost/rest/healthz
```

Open https://supadupabase.whitelynx.co.nz/admin/ — sign in with an email listed in `ADMIN_EMAILS`.

## 6. Create API keys

1. Sign in to admin
2. Go to **API Keys** → create `anon` and `service_role` keys
3. Use `anon` key in your PWAs via `@supadupabase/sdk`

## 7. Outbound email (Gmail / Timesheet App)

The **mail-service** sends weekly timesheet submissions to a boss email. Auth signup does **not** send verification emails yet.

1. On the Google account (`johngoodspeed77@gmail.com`): enable **2FA**, then create an [App Password](https://myaccount.google.com/apppasswords).
2. Add to `.env` on the VM:

| Variable | Gmail value |
|----------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `johngoodspeed77@gmail.com` |
| `SMTP_PASS` | 16-character app password (not your login password) |
| `SMTP_FROM` | `johngoodspeed77@gmail.com` |
| `SMTP_SECURE` | `false` |

3. Start or restart mail-service:

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build mail-service caddy
curl https://supadupabase.whitelynx.co.nz/mail/healthz
```

4. In the Timesheet PWA: set **boss email** in Settings, then submit a week — the email is sent **from** `SMTP_FROM` **to** the boss address.

## Troubleshooting

```bash
# Logs
docker compose -f infra/docker-compose.yml --env-file .env logs -f auth-service

# Re-run migrations
docker compose -f infra/docker-compose.yml --env-file .env --profile migrate run --rm migrate

# Restart stack
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

## What stays on this dev PC

- Code edits, `npm run build`, git push
- Local dev: `infra/docker-compose.dev.yml` + `npm run dev` (optional)

Production runs **only on the VM**.
