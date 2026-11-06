#!/bin/bash
# Konesans server setup — paste this whole file into "User data" when you create the server
# (DigitalOcean: Create Droplet → Advanced options → Add initialization scripts).
# Ubuntu 24.04, 1 GB RAM minimum. Only edit the two lines below.

ADMIN_EMAIL="CHANGE-ME@example.com"   # your email: the admin panel login
ADMIN_PASSWORD="CHANGE-ME-8+chars"    # your admin password (at least 8 characters)

# ---------------------------------------------------------------------------
set -euo pipefail
exec > >(tee -a /var/log/konesans-setup.log) 2>&1
REPO="https://github.com/douggue/konesans.git"
BASE=/opt/konesans

echo "== Konesans setup $(date -u)"
export DEBIAN_FRONTEND=noninteractive

# swap so Postgres + Nakama fit on a 1 GB server
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Docker + git + firewall
apt-get update -y
apt-get install -y ca-certificates curl git ufw openssl
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

mkdir -p "$BASE"
# Secrets: generated once, kept on this server only
if [ ! -f "$BASE/.env" ]; then
  IP=$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')
  rnd() { openssl rand -hex 16; }
  cat > "$BASE/.env" <<ENV
DOMAIN=${IP//./-}.sslip.io
POSTGRES_PASSWORD=$(rnd)
SESSION_KEY=$(rnd)
REFRESH_KEY=$(rnd)
CONSOLE_PASSWORD=$(rnd)
CONSOLE_KEY=$(rnd)
ADMIN_EMAILS=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENV
  chmod 600 "$BASE/.env"
fi

# The ready-to-run build lives on the `deploy` branch (built by GitHub Actions)
if [ ! -d "$BASE/app/.git" ]; then git clone --branch deploy --depth 1 "$REPO" "$BASE/app"; fi
install -m 755 "$BASE/app/update.sh" /usr/local/bin/konesans-update

# Check for a new build every 2 minutes
cat > /etc/systemd/system/konesans-update.service <<'UNIT'
[Unit]
Description=Konesans: pull the latest deploy build
After=docker.service network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/konesans-update
UNIT
cat > /etc/systemd/system/konesans-update.timer <<'UNIT'
[Unit]
Description=Konesans: check for updates every 2 minutes
[Timer]
OnBootSec=30s
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload

# First start, then turn on the 2-minute check (never both at once)
FORCE=1 /usr/local/bin/konesans-update
systemctl enable --now konesans-update.timer
. "$BASE/.env"
echo "== Done. Admin panel: https://admin.${DOMAIN}   API: https://api.${DOMAIN}"
echo "https://admin.${DOMAIN}" > "$BASE/ADMIN_URL.txt"
