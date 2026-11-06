# Putting Konesans on your own server

About 10 minutes, once. After that, everything updates by itself: when code is pushed to GitHub, a build lands on the `deploy` branch and your server picks it up within 2 minutes.

## 1. Create the server (DigitalOcean)
1. Sign up at digitalocean.com and add a payment method.
2. **Create → Droplets**.
3. Region: **New York** (closest to Haiti and Miami).
4. Image: **Ubuntu 24.04 (LTS) x64**.
5. Size: **Basic → Regular → $6/month (1 GB / 25 GB)**. (Pick $12 / 2 GB later if many kids play at once.)
6. Authentication: **Password** — choose a strong root password and keep it somewhere safe (you'll rarely need it).
7. **Advanced options → Add initialization scripts (free)**: paste the whole content of [`server/deploy/setup.sh`](../server/deploy/setup.sh), then change the two lines at the top:
   ```
   ADMIN_EMAIL="your email"
   ADMIN_PASSWORD="your admin password"
   ```
8. Hostname: `konesans`. Click **Create Droplet**.

## 2. Wait ~5 minutes, then open the admin
Copy the droplet's **IPv4 address** (for example `164.92.10.23`). Your addresses are that IP with dashes:
- Admin panel: `https://admin.164-92-10-23.sslip.io`
- API for the apps: `https://api.164-92-10-23.sslip.io`

Log in with the email and password you put in the script. On first login the dashboard offers **Enpòte bank kesyon an**: click it to load all the questions, then **Pibliye**.

Send the IP to Claude so the kids' app and the admin app point to your server.

## 3. Day to day
- **Review questions**: Kesyon → pick a category → filter *Pou relekti* → ✓ Apwouve or open to correct.
- **Nothing reaches kids until you press _Pibliye_.** The app checks for a new version each time it opens.
- **Kategori**: rename, reorder, hide, mark "Nouvo", change colour and picture.
- **Paramèt app la**: turn features on/off, post an announcement, maintenance mode.
- **Tèks app la**: change any text of the app (Kreyòl and French).

## If something goes wrong
- Setup log on the server: `/var/log/konesans-setup.log`; deploy log: `/opt/konesans/deploys.log`.
- DigitalOcean → your droplet → **Console** opens a terminal in the browser. Useful commands:
  - `cat /opt/konesans/ADMIN_URL.txt` — the admin address
  - `docker compose -p konesans ps` (run inside `/opt/konesans/app`) — are the 3 services up?
  - `docker compose -p konesans logs --tail 50 nakama`
- The Nakama console (advanced) is only reachable from the server itself on port 7351; its password is in `/opt/konesans/.env`.
- Backups: DigitalOcean → droplet → **Backups** ($1.20/month) keeps weekly copies of everything.
