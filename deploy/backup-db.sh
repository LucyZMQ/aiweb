#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/moyu-$STAMP.sql.gz"

docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T \
  -e "PGPASSWORD=${DB_PASSWORD}" db \
  pg_dump -U moyu -d moyu --no-owner --no-privileges | gzip > "$FILE"

find "$BACKUP_DIR" -name 'moyu-*.sql.gz' -type f -mtime "+$KEEP_DAYS" -delete

echo "backup written: $FILE"
echo "restore: gunzip -c $FILE | docker compose --env-file .env -f deploy/docker-compose.prod.yml exec -T db psql -U moyu -d moyu"
