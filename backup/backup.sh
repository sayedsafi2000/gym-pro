#!/bin/bash

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="gymdb_${TIMESTAMP}.gz"
MAX_BACKUPS="${BACKUP_MAX_COUNT:-7}"

echo "==========================================="
echo "[$(date)] Starting backup..."

# Dump MongoDB
mongodump --host mongo --port 27017 --db gymdb --archive="${BACKUP_DIR}/${BACKUP_FILE}" --gzip 2>&1

if [ $? -eq 0 ]; then
  FILESIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
  echo "[$(date)] Dump successful: ${BACKUP_FILE} (${FILESIZE})"

  # Upload to Google Drive (if configured)
  if rclone listremotes 2>/dev/null | grep -q "gdrive:"; then
    echo "[$(date)] Uploading to Google Drive..."
    rclone copy "${BACKUP_DIR}/${BACKUP_FILE}" gdrive:gym-backups/ 2>&1
    if [ $? -eq 0 ]; then
      echo "[$(date)] Uploaded to Google Drive"

      # Rotate Google Drive backups — keep only last MAX_BACKUPS
      GDRIVE_FILES=$(rclone lsf gdrive:gym-backups/ --files-only 2>/dev/null | sort)
      GDRIVE_COUNT=$(echo "$GDRIVE_FILES" | grep -c "gymdb_" 2>/dev/null || echo "0")
      if [ "$GDRIVE_COUNT" -gt "$MAX_BACKUPS" ]; then
        DELETE_COUNT=$((GDRIVE_COUNT - MAX_BACKUPS))
        echo "[$(date)] Rotating Google Drive: removing $DELETE_COUNT old backup(s)"
        echo "$GDRIVE_FILES" | grep "gymdb_" | head -n "$DELETE_COUNT" | while read -r OLD_FILE; do
          rclone deletefile "gdrive:gym-backups/${OLD_FILE}" 2>&1
          echo "[$(date)] Deleted from Drive: ${OLD_FILE}"
        done
      fi
    else
      echo "[$(date)] ERROR: Google Drive upload failed"
    fi
  else
    echo "[$(date)] Google Drive not configured, local backup only"
  fi

  # Rotate local backups — keep only last MAX_BACKUPS
  LOCAL_COUNT=$(ls -1 ${BACKUP_DIR}/gymdb_*.gz 2>/dev/null | wc -l)
  if [ "$LOCAL_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((LOCAL_COUNT - MAX_BACKUPS))
    echo "[$(date)] Rotating local: removing $DELETE_COUNT old backup(s)"
    ls -1 ${BACKUP_DIR}/gymdb_*.gz | sort | head -n "$DELETE_COUNT" | while read -r OLD_FILE; do
      rm -f "$OLD_FILE"
      echo "[$(date)] Deleted: $(basename $OLD_FILE)"
    done
  fi

  echo "[$(date)] Backups: ${LOCAL_COUNT} local, keeping last ${MAX_BACKUPS}"
else
  echo "[$(date)] ERROR: mongodump failed!"
fi

echo "[$(date)] Backup complete"
echo "==========================================="
