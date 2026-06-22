#!/usr/bin/env bash
set -euo pipefail

# Backs up the Postgres database used by the docker-compose stack to a
# gzip-compressed SQL dump. Intended to be run from the repo root, or on
# a schedule via cron, e.g.:
#   0 3 * * * cd /path/to/the-shelf && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# Usage: ./scripts/backup.sh [backup-dir]

cd "$(dirname "$0")/.."

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-shelf}"
POSTGRES_DB="${POSTGRES_DB:-the_shelf}"

OUT_FILE="$BACKUP_DIR/the-shelf-${TIMESTAMP}.sql.gz"

echo "Backing up database '$POSTGRES_DB' to $OUT_FILE ..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"

echo "Backup written: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

if [ "$RETENTION_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" -name 'the-shelf-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
fi
