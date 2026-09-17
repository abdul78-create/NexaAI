# NexaAI Production Deployment Runbook

**Project**: NexaAI Multimodal AI SaaS Platform  
**Location**: `C:\Users\Abdul\Desktop\Chatbot`  
**Target Architecture**: Docker Compose + Nginx + PostgreSQL 16 (pgvector) + Redis 7  
**Date**: September 16, 2026  
**Status**: Completed Workstream 8  

---

## 1. Prerequisites & System Requirements

Before executing a production deployment of NexaAI, ensure the target server environment meets the following baseline requirements:

- **Operating System**: Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, or Enterprise Linux (RHEL/Rocky/Alma 9).
- **CPU / RAM**: Minimum 2 vCPU, 4 GB RAM (8 GB RAM recommended for vision/multimodal OCR workloads).
- **Disk Space**: Minimum 20 GB SSD storage.
- **Installed Software**:
  - Docker Engine 24.0+
  - Docker Compose v2.20+
  - Git
  - Python 3.10+ (for administrative scripts)

---

## 2. Step 1: Environment & Secret Provisioning

1. Clone or sync the repository to the production server:
   ```bash
   git clone <repository_url> /opt/nexaai
   cd /opt/nexaai
   ```

2. Generate cryptographically secure production secrets:
   ```bash
   python3 scripts/generate_secrets.py
   ```

3. Create the production `.env` configuration file in the project root:
   ```bash
   cp .env.example .env
   ```

4. Populate `.env` with real production values:
   ```env
   APP_ENV=production
   DEBUG=false
   
   # Database Configuration
   POSTGRES_DB=nexaai
   POSTGRES_USER=nexaai_user
   POSTGRES_PASSWORD=<generated_pg_password>
   
   # Application Secrets
   SECRET_KEY=<generated_app_secret_key>
   JWT_SECRET_KEY=<generated_jwt_secret_key>
   
   # AI Provider Setup
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-proj-your-real-openai-api-key
   OPENAI_MODEL=gpt-4o-mini
   
   # Domain & CORS
   NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
   CORS_ORIGINS=["https://your-domain.com"]
   ```

---

## 3. Step 2: Container Launch & Migration Execution

1. Build and start production containers in detached daemon mode:
   ```bash
   docker compose -f infra/docker-compose.prod.yml up -d --build
   ```

2. Verify container startup and health status:
   ```bash
   docker compose -f infra/docker-compose.prod.yml ps
   ```

3. Execute database schema migrations against PostgreSQL:
   ```bash
   docker compose -f infra/docker-compose.prod.yml exec api python -m alembic upgrade head
   ```

---

## 4. Step 3: Nginx SSL & Reverse Proxy Setup

1. Obtain SSL/TLS certificates via Let's Encrypt / Certbot:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. Verify Nginx configuration syntax:
   ```bash
   docker compose -f infra/docker-compose.prod.yml exec nginx nginx -t
   ```

3. Reload Nginx configuration:
   ```bash
   docker compose -f infra/docker-compose.prod.yml exec nginx nginx -s reload
   ```

---

## 5. Step 4: Health Probes & Post-Deployment Smoke Verification

1. Check system readiness probes:
   ```bash
   curl -i http://localhost:8000/health/readiness
   ```
   *Expected Response*: `{"status":"healthy","service":"nexaai-api","version":"0.1.0","environment":"production","database":"connected","redis":"connected"}`

2. Run the automated non-destructive smoke test suite:
   ```bash
   python3 scripts/smoke_test.py http://localhost:8000
   ```

---

## 6. Maintenance & Backup Operations

### Daily Database Backup
Add a cron entry to execute daily backups at 02:00 AM:
```bash
0 2 * * * cd /opt/nexaai && ./scripts/db_backup.sh ./backups >> /var/log/nexaai_backup.log 2>&1
```

### Container Application Updates
To pull code updates and execute a zero-downtime rolling update:
```bash
git pull origin main
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml up -d --no-deps api web
docker compose -f infra/docker-compose.prod.yml exec api python -m alembic upgrade head
```

### Emergency Rollback
If a deployment fails, revert to the previous container images:
```bash
docker compose -f infra/docker-compose.prod.yml down
# Restore latest backup dump if schema migration was destructive
./scripts/db_restore.sh ./backups/<latest_dump_file>.dump
docker compose -f infra/docker-compose.prod.yml up -d
```
