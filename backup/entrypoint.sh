#!/bin/bash
set -e

# Write rclone config from env vars (if provided)
mkdir -p /root/.config/rclone
if [ -n "$GDRIVE_TOKEN" ]; then
  cat > /root/.config/rclone/rclone.conf << EOF
[gdrive]
type = drive
client_id = ${GDRIVE_CLIENT_ID}
client_secret = ${GDRIVE_CLIENT_SECRET}
token = ${GDRIVE_TOKEN}
root_folder_id = ${GDRIVE_FOLDER_ID}
EOF
  echo "[entrypoint] Google Drive configured"
else
  echo "[entrypoint] Google Drive not configured — local backups only"
fi

# Ensure backup directory exists
mkdir -p /backups

# Set up cron schedule (default: every 24 hours at 2am)
CRON_SCHEDULE="${BACKUP_CRON:-0 2 * * *}"
echo "$CRON_SCHEDULE /backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root
echo "[entrypoint] Cron schedule: $CRON_SCHEDULE"

# Create log file
touch /var/log/backup.log

# Run initial backup on startup (wait for MongoDB to be ready)
echo "[entrypoint] Waiting for MongoDB..."
sleep 10
/backup.sh

echo "[entrypoint] Starting cron daemon..."
# Start cron daemon in foreground
crond -f -l 2
