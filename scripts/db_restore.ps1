# NexaAI PostgreSQL Database Restore Script (PowerShell)
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbHost = $env:POSTGRES_HOST,
    [string]$DbPort = $env:POSTGRES_PORT,
    [string]$DbName = $env:POSTGRES_DB,
    [string]$DbUser = $env:POSTGRES_USER
)

if (-not $DbHost) { $DbHost = "localhost" }
if (-not $DbPort) { $DbPort = "5432" }
if (-not $DbName) { $DbName = "nexaai" }
if (-not $DbUser) { $DbUser = "nexaai_user" }

if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file '$BackupFile' does not exist." -ForegroundColor Red
    exit 1
}

Write-Host "============================================================"
Write-Host "WARNING: DATABASE RESTORE INITIATED"
Write-Host "Target Database: ${DbName}@${DbHost}:${DbPort}"
Write-Host "Source File    : ${BackupFile}"
Write-Host "============================================================"

$env:PGPASSWORD = $env:POSTGRES_PASSWORD

pg_restore -h $DbHost -p $DbPort -U $DbUser -d $DbName --clean --if-exists -v $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Database restored successfully." -ForegroundColor Green
} else {
    Write-Host "WARNING: pg_restore completed with code $LASTEXITCODE. Check warnings or errors above." -ForegroundColor Yellow
}
