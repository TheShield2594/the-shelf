#!/usr/bin/env bash
set -euo pipefail

# Restores a Postgres backup created by scripts/backup.sh into the
# docker-compose stack's database. This REPLACES all current data.
#
# Usage: ./scripts/restore.sh <backup-file.sql.gz>

cd "$(dirname "$0")/.."

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-shelf}"
POSTGRES_DB="${POSTGRES_DB:-the_shelf}"

read -r -p "This will overwrite all data in '$POSTGRES_DB'. Continue? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring $BACKUP_FILE into '$POSTGRES_DB' ..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restore complete."
