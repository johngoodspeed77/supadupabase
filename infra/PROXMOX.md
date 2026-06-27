# SupaDupaBase — Proxmox VM provisioning

Run SupaDupaBase on a **new dedicated full VM** (not the existing busy shared VM).

## VM specs

| Setting | Value |
|---------|--------|
| Type | Full VM (not LXC) |
| OS | Ubuntu 24.04 LTS |
| vCPU | 4 |
| RAM | 8 GB |
| Disk | 40 GB |
| Network | Static LAN IP |
| GPU | Not required |

## Proxmox steps

1. Create VM → import Ubuntu 24.04 cloud image or ISO install
2. Enable QEMU guest agent
3. Assign static IP (e.g. `192.168.x.x`)
4. Install base packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 ufw curl git
sudo usermod -aG docker $USER
```

5. Firewall:

```bash
sudo ufw default deny incoming
sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp
sudo ufw enable
```

No inbound 80/443 from WAN — Cloudflare Tunnel handles public access.

6. Clone this repository to `/opt/supadupabase`
7. Copy `.env.example` → `.env` and set production secrets
8. Follow [DEPLOY.md](./DEPLOY.md) for Docker + Caddy + cloudflared

## DNS

- Public: `supadupabase.whitelynx.co.nz` → Cloudflare Tunnel (not router port forward)
- LAN: optional hosts entry for SSH/admin

## Backups

- Proxmox snapshot before major upgrades
- Nightly `pg_dump` (cron) to NFS or Proxmox backup storage (Phase 3)
