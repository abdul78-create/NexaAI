# NexaAI Database Operations Runbook

**Project**: NexaAI Multimodal AI SaaS Platform  
**Location**: `C:\Users\Abdul\Desktop\Chatbot`  
**Database**: PostgreSQL 16 (`pgvector/pgvector:pg16`) / SQLite (Local Dev)  

---

## 1. Migration Management (Alembic)

NexaAI uses Alembic for asynchronous schema migrations. All migrations are located in `apps/api/alembic/versions`.

### Common Commands (Run inside `apps/api`)

```bash
# Check current migration status
.venv\Scripts\python -m alembic current

# Upgrade to latest schema (head)
.venv\Scripts\python -m alembic upgrade head

# Downgrade by one revision (if safe rollback is supported)
.venv\Scripts\python -m alembic downgrade -1

# Generate a new auto-detected migration revision
.venv\Scripts\python -m alembic revision --autogenerate -m "describe_change"
```

### Safety Rules

1. **Never drop production tables** without creating a verified database snapshot first.
2. **Sequential Versioning**: Ensure version files follow standard sequential prefixes (`001`, `002`, ..., `012`).
3. **Zero Insecure Defaults**: Ensure Alembic connects via environment settings (`DATABASE_URL`).

---

## 2. Automated Database Backups

Database backups can be taken using the provided PowerShell or Bash utility scripts located in `scripts/`.

### Running Backups

#### Windows (PowerShell)
```powershell
$env:POSTGRES_PASSWORD="your_secure_password"
.\scripts\db_backup.ps1 -OutputDir "./backups"
```

#### Linux / Docker Container (Bash)
```bash
export POSTGRES_PASSWORD="your_secure_password"
./scripts/db_backup.sh ./backups
```

### Output Format
Backups are created in PostgreSQL custom binary format (`.dump`) with timestamped filenames:
```text
backups/nexaai_backup_nexaai_20260916_193000.dump
```

---

## 3. Database Restoration

To restore a database snapshot into a clean target instance:

#### Windows (PowerShell)
```powershell
$env:POSTGRES_PASSWORD="your_secure_password"
.\scripts\db_restore.ps1 -BackupFile "./backups/nexaai_backup_nexaai_20260916_193000.dump"
```

#### Linux / Docker Container (Bash)
```bash
export POSTGRES_PASSWORD="your_secure_password"
./scripts/db_restore.sh ./backups/nexaai_backup_nexaai_20260916_193000.dump
```

---

## 4. Disaster Recovery & Retention Guidance

1. **Backup Frequency**: Execute automated daily logical dumps in production.
2. **Retention Period**: Retain daily dumps for 30 days; retain weekly snapshots for 90 days.
3. **Offsite Replication**: Encrypt backups before uploading to secure blob storage (AWS S3, GCP Cloud Storage, or Azure Blob).
