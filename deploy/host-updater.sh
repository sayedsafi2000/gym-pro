#!/bin/bash
# GymPro — Host Updater (Mac/Linux)
#
# Installed by setup-client.sh to $HOME/gym-pro/host-updater.sh.
# Launched every 60s by launchd (macOS) / cron (Linux).
#
# Polls ~/gym-pro/system/update-requested.json. When present:
#   1. Write update-status.json { state: "running" }
#   2. Delete trigger file
#   3. Run update-client.sh
#   4. Write update-status.json { state: "done" | "failed" }
#
# Touches update-status.json every tick so the UI can tell the watcher is alive.

set -u

INSTALL_DIR="$HOME/gym-pro"
SYSTEM_DIR="$INSTALL_DIR/system"
TRIGGER="$SYSTEM_DIR/update-requested.json"
STATUS="$SYSTEM_DIR/update-status.json"
LOCK="$SYSTEM_DIR/.updating"
LOG="$SYSTEM_DIR/update.log"
UPDATE_SCRIPT="$INSTALL_DIR/update-client.sh"

mkdir -p "$SYSTEM_DIR"

write_status() {
  local json="$1"
  printf '%s' "$json" > "$STATUS"
}

# Heartbeat: always touch status so watcher-health endpoint sees fresh mtime.
if [ ! -f "$STATUS" ]; then
  write_status '{"state":"idle"}'
else
  touch "$STATUS"
fi

# No trigger → exit (heartbeat already done above).
if [ ! -f "$TRIGGER" ]; then
  exit 0
fi

# Lock prevents overlap if launchd/cron double-fires.
if [ -f "$LOCK" ]; then
  exit 0
fi
touch "$LOCK"

STARTED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
write_status "{\"state\":\"running\",\"startedAt\":\"$STARTED\"}"
rm -f "$TRIGGER"

echo "[$(date)] Update triggered. Running $UPDATE_SCRIPT" >> "$LOG"

if bash "$UPDATE_SCRIPT" >> "$LOG" 2>&1; then
  FINISHED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  write_status "{\"state\":\"done\",\"startedAt\":\"$STARTED\",\"finishedAt\":\"$FINISHED\"}"
  echo "[$(date)] Update complete." >> "$LOG"
else
  EXIT_CODE=$?
  FINISHED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  write_status "{\"state\":\"failed\",\"startedAt\":\"$STARTED\",\"finishedAt\":\"$FINISHED\",\"error\":\"update-client.sh exited $EXIT_CODE — see update.log\"}"
  echo "[$(date)] Update FAILED with exit $EXIT_CODE." >> "$LOG"
fi

rm -f "$LOCK"
