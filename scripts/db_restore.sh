#!/usr/bin/env bash
# NexaAI PostgreSQL Database Restore Script (Bash)
set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path_to_dump_file>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: File '${BACKUP_FILE}' not found."
  exit 1
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-nexaai}"
DB_USER="${POSTGRES_USER:-nexaai_user}"

echo "============================================================"
echo "WARNING: DATABASE RESTORE INITIATED"
echo "Target Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Source File    : ${BACKUP_FILE}"
echo "============================================================"

export PGPASSWORD="${POSTGRES_PASSWORD:-}"

pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists -v "${BACKUP_FILE}"

echo "SUCCESS: Database restore completed."
