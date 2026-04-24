# GymPro - Update (Windows PowerShell)
# Mirrors deploy/update-client.sh.
# Run: powershell -ExecutionPolicy Bypass -File .\update-client.ps1

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '======================================'
Write-Host '  GymPro - Update'
Write-Host '======================================'
Write-Host ''

$InstallDir = Join-Path $env:USERPROFILE 'gym-pro'
$envPath = Join-Path $InstallDir '.env'

if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: GymPro not found at $InstallDir" -ForegroundColor Red
    Write-Host 'Run setup-client.ps1 first.'
    exit 1
}

Set-Location $InstallDir

# --- Read branch + tag from .env ---
$envLines = Get-Content $envPath
function Get-EnvValue($key) {
    $line = $envLines | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if (-not $line) { return '' }
    return ($line -split '=', 2)[1]
}
$BRANCH = Get-EnvValue 'BRANCH'
if ([string]::IsNullOrWhiteSpace($BRANCH)) { $BRANCH = 'main' }
$IMAGE_TAG = Get-EnvValue 'IMAGE_TAG'
$GITHUB_OWNER = Get-EnvValue 'GITHUB_OWNER'
if ([string]::IsNullOrWhiteSpace($GITHUB_OWNER)) { $GITHUB_OWNER = 'sayedsafi2000' }

Write-Host "Branch: $BRANCH"
Write-Host "Tag:    $IMAGE_TAG"
Write-Host ''

# --- Re-download compose from branch (structure may have changed) ---
$composeUrl = "https://raw.githubusercontent.com/$GITHUB_OWNER/gym-pro/$BRANCH/docker-compose.deploy.yml"
Write-Host 'Refreshing compose file...'
try {
    Invoke-WebRequest -UseBasicParsing -Uri $composeUrl -OutFile 'docker-compose.yml'
} catch {
    Write-Host "WARNING: could not refresh compose file, using existing one." -ForegroundColor Yellow
}

# --- Pull + restart ---
Write-Host 'Pulling latest images...'
docker compose pull
if ($LASTEXITCODE -ne 0) { Write-Host 'docker compose pull failed.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host 'Restarting containers...'
docker compose up -d --remove-orphans
if ($LASTEXITCODE -ne 0) { Write-Host 'docker compose up failed.' -ForegroundColor Red; exit 1 }

Start-Sleep -Seconds 5

Write-Host ''
Write-Host '======================================'
Write-Host '  Update Complete!'
Write-Host '======================================'
Write-Host ''
Write-Host "  URL:    http://localhost"
Write-Host "  Branch: $BRANCH"
Write-Host "  Tag:    $IMAGE_TAG"
Write-Host ''
Write-Host '  Data (members, payments, etc.) preserved.'
Write-Host '======================================'
