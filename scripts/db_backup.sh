#!/usr/bin/env bash
# NexaAI PostgreSQL Database Backup Script (Bash)
set -euo pipefail

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-nexaai}"
DB_USER="${POSTGRES_USER:-nexaai_user}"
OUTPUT_DIR="${1:-./backups}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "${OUTPUT_DIR}"

BACKUP_FILE="${OUTPUT_DIR}/nexaai_backup_${DB_NAME}_${TIMESTAMP}.dump"

echo "============================================================"
echo "NexaAI Database Backup System"
echo "============================================================"
echo "Target Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Output File    : ${BACKUP_FILE}"
echo "============================================================"

export PGPASSWORD="${POSTGRES_PASSWORD:-}"

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -F c -b -v -f "${BACKUP_FILE}" "${DB_NAME}"

echo "SUCCESS: Database backup created successfully at ${BACKUP_FILE}"
