#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  LOCAL_DATABASE_URL=postgresql://user:pass@localhost:5432/db \
  RDS_DATABASE_URL=postgresql://user:pass@host:5432/db \
  ./scripts/db/migrate_postgres_to_rds.sh

Optional env vars:
  DUMP_FILE              Path for the temporary dump file (default: /tmp/interview-platform.dump)
  DROP_EXISTING          Set to true to drop existing objects on the target before restore (default: true)

The script expects `pg_dump`, `pg_restore`, and `psql` to be installed.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command pg_dump
require_command pg_restore
require_command psql

LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-}"
RDS_DATABASE_URL="${RDS_DATABASE_URL:-}"
DUMP_FILE="${DUMP_FILE:-/tmp/interview-platform.dump}"
DROP_EXISTING="${DROP_EXISTING:-true}"

if [[ -z "${LOCAL_DATABASE_URL}" ]]; then
  echo "LOCAL_DATABASE_URL is required." >&2
  usage
  exit 1
fi

if [[ -z "${RDS_DATABASE_URL}" ]]; then
  echo "RDS_DATABASE_URL is required." >&2
  usage
  exit 1
fi

echo "Dumping local database to ${DUMP_FILE}..."
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --verbose \
  --file "${DUMP_FILE}" \
  "${LOCAL_DATABASE_URL}"

if [[ "${DROP_EXISTING}" == "true" ]]; then
  echo "Preparing target RDS database for clean restore..."
  pg_restore \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --verbose \
    --dbname "${RDS_DATABASE_URL}" \
    "${DUMP_FILE}"
else
  echo "Restoring into RDS without dropping existing objects..."
  pg_restore \
    --no-owner \
    --no-acl \
    --verbose \
    --dbname "${RDS_DATABASE_URL}" \
    "${DUMP_FILE}"
fi

echo "Restore complete. Verifying target connection..."
psql "${RDS_DATABASE_URL}" -c 'SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ''public'';'

echo "Done."