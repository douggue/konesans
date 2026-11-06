#!/bin/bash
# Pull the latest `deploy` build and make sure the stack is running. Run by a systemd timer every 2 minutes.
# Safe to run any time: only one copy runs at once, and `docker compose up -d` does nothing when all is up.
set -euo pipefail
BASE=/opt/konesans
APP="$BASE/app"

exec 9>/var/lock/konesans-update.lock
flock -n 9 || exit 0   # another update is already running

cd "$APP"
OLD=$(git rev-parse HEAD)
git fetch --depth 1 origin deploy -q
NEW=$(git rev-parse FETCH_HEAD)
if [ "$OLD" != "$NEW" ]; then
  git reset --hard -q FETCH_HEAD
  install -m 755 "$APP/update.sh" /usr/local/bin/konesans-update
fi

set -a; . "$BASE/.env"; . "$APP/keys.env"; set +a
# admin panel settings (served with no-store)
printf "window.KONESANS = { api: '', serverKey: '%s' };\n" "$SERVER_KEY" > "$APP/admin/config.js"

docker compose --env-file "$BASE/.env" --env-file "$APP/keys.env" -p konesans up -d --remove-orphans --quiet-pull
# the module is mounted read-only; restart Nakama so it loads a new build
if [ "$OLD" != "$NEW" ] || [ -n "${FORCE:-}" ]; then
  docker compose -p konesans restart nakama >/dev/null
  echo "$(date -u) deployed $NEW" >> "$BASE/deploys.log"
fi
