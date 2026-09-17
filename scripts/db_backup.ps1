# NexaAI PostgreSQL Database Backup Script (PowerShell)
param (
    [string]$DbHost = $env:POSTGRES_HOST,
    [string]$DbPort = $env:POSTGRES_PORT,
    [string]$DbName = $env:POSTGRES_DB,
    [string]$DbUser = $env:POSTGRES_USER,
    [string]$OutputDir = "./backups"
)

if (-not $DbHost) { $DbHost = "localhost" }
if (-not $DbPort) { $DbPort = "5432" }
if (-not $DbName) { $DbName = "nexaai" }
if (-not $DbUser) { $DbUser = "nexaai_user" }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$BackupFile = Join-Path $OutputDir "nexaai_backup_${DbName}_${Timestamp}.dump"

Write-Host "============================================================"
Write-Host "NexaAI Database Backup System"
Write-Host "============================================================"
Write-Host "Target Database: ${DbName}@${DbHost}:${DbPort}"
Write-Host "Output File    : ${BackupFile}"
Write-Host "============================================================"

$env:PGPASSWORD = $env:POSTGRES_PASSWORD

pg_dump -h $DbHost -p $DbPort -U $DbUser -F c -b -v -f $BackupFile $DbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Database backup created successfully." -ForegroundColor Green
} else {
    Write-Host "ERROR: Database backup failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
}
