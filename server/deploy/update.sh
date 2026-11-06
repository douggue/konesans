#!/bin/bash
# Pull the latest `deploy` build and (re)start the stack when it changed. Run by a systemd timer every 2 minutes.
set -euo pipefail
BASE=/opt/konesans
APP="$BASE/app"
cd "$APP"
OLD=$(git rev-parse HEAD)
git fetch --depth 1 origin deploy -q
NEW=$(git rev-parse FETCH_HEAD)
if [ "$OLD" = "$NEW" ] && [ -z "${FORCE:-}" ]; then exit 0; fi
git reset --hard -q FETCH_HEAD
install -m 755 "$APP/update.sh" /usr/local/bin/konesans-update

set -a; . "$BASE/.env"; . "$APP/keys.env"; set +a
# admin panel settings (served with no-store)
printf "window.KONESANS = { api: '', serverKey: '%s' };\n" "$SERVER_KEY" > "$APP/admin/config.js"

docker compose --env-file "$BASE/.env" --env-file "$APP/keys.env" -p konesans up -d --remove-orphans
# the module is mounted read-only; restart Nakama so it loads the new build
if [ "$OLD" != "$NEW" ]; then docker compose -p konesans restart nakama; fi
echo "$(date -u) deployed $NEW" >> "$BASE/deploys.log"
