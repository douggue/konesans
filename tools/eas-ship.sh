#!/bin/bash
# Ship an Expo app from CI: over-the-air update when possible, new APK only when needed.
#   tools/eas-ship.sh apps/mobile
# If an APK already exists for this exact native fingerprint (same native code), phones already have the
# right shell: publish an EAS Update to the "preview" channel and they pick it up on next launch.
# Otherwise (new native module, app.json change, …) start a new APK build; it includes the latest code.
set -euo pipefail
cd "$1"
MSG="$(git log -1 --pretty=%s | cut -c1-200)"
FP=$(eas fingerprint:generate --platform android --build-profile preview --json --non-interactive | jq -r '.hash')
echo "Native fingerprint: $FP"
EXISTING=$(eas build:list --platform android --fingerprint-hash "$FP" --json --non-interactive --limit 10 \
  | jq '[.[] | (.status // "" | ascii_downcase | gsub("-"; "_")) | select(. == "finished" or . == "in_progress" or . == "in_queue" or . == "new")] | length')
if [ "${EXISTING:-0}" -gt 0 ]; then
  echo "An APK with this native code exists → publishing an over-the-air update"
  eas update --channel preview --platform android --environment preview --message "$MSG" --non-interactive
else
  echo "Native code changed → building a new APK"
  eas build --platform android --profile preview --non-interactive --no-wait
fi
