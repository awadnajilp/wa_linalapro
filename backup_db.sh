#!/bin/bash

# Database Backup Script for wa.linalapro.com
# Scheduled to run twice daily.

# Configuration
DB_NAME="walinalapro"
DB_USER="walinalapro"
DB_PASS="walinalapro123"
DB_HOST="localhost"
BACKUP_DIR="/var/www/wa.linalapro.com_backups/db"
RETENTION_COUNT=10

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Date string for filename
DATE_STR=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/walinalapro_db_$DATE_STR.sql.gz"

echo "[$(date)] Starting database backup..."

# Run pg_dump and compress
PGPASSWORD="$DB_PASS" pg_dump -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    echo "[$(date)] Backup completed successfully: $BACKUP_FILE"
    echo "[$(date)] Compressed backup size: $(du -sh "$BACKUP_FILE" | cut -f1)"
else
    echo "[$(date)] ERROR: Backup failed!" >&2
    exit 1
fi

# Prune old backups (keep only the newest RETENTION_COUNT files)
echo "[$(date)] Running retention policy (keeping last $RETENTION_COUNT backups)..."
ls -1tr "$BACKUP_DIR"/walinalapro_db_*.sql.gz 2>/dev/null | head -n -"$RETENTION_COUNT" | while read -r file_to_delete; do
    if [ -n "$file_to_delete" ] && [ -f "$file_to_delete" ]; then
        echo "[$(date)] Removing old backup: $file_to_delete"
        rm -f "$file_to_delete"
    fi
done

echo "[$(date)] Backup process completed."
