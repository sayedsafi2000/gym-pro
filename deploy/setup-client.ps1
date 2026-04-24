# GymPro - Client Setup (Windows PowerShell)
# Mirrors deploy/setup-client.sh for clients without bash.
# Run: powershell -ExecutionPolicy Bypass -File .\setup-client.ps1

$ErrorActionPreference = 'Stop'

function Write-Banner($title) {
    Write-Host ''
    Write-Host '======================================'
    Write-Host "  $title"
    Write-Host '======================================'
    Write-Host ''
}

Write-Banner 'GymPro - Client Setup'

# --- Docker checks ---
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: Docker is not installed.' -ForegroundColor Red
    Write-Host 'Install Docker Desktop: https://www.docker.com/products/docker-desktop/'
    exit 1
}
docker info *>$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: Docker is not running. Start Docker Desktop first.' -ForegroundColor Red
    exit 1
}
Write-Host 'Docker OK.'

# --- Collect client info ---
$GYM_NAME    = Read-Host 'Gym Name'
$GYM_PHONE   = Read-Host 'Gym Phone'
$GYM_ADDRESS = Read-Host 'Gym Address'

$branchPrompt = Read-Host 'Branch (e.g., main, client/alpha-gym) [main]'
$BRANCH = if ([string]::IsNullOrWhiteSpace($branchPrompt)) { 'main' } else { $branchPrompt }

$tagPrompt = Read-Host 'Image Tag (e.g., latest, client-alpha-gym) [latest]'
$IMAGE_TAG = if ([string]::IsNullOrWhiteSpace($tagPrompt)) { 'latest' } else { $tagPrompt }

$seedEmailPrompt = Read-Host 'Seed super-admin email [admin@gym.com]'
$SEED_EMAIL = if ([string]::IsNullOrWhiteSpace($seedEmailPrompt)) { 'admin@gym.com' } else { $seedEmailPrompt }

$seedPwPrompt = Read-Host 'Seed super-admin password [Password123]'
$SEED_PASSWORD = if ([string]::IsNullOrWhiteSpace($seedPwPrompt)) { 'Password123' } else { $seedPwPrompt }

# --- GHCR login ---
$GITHUB_OWNER = 'sayedsafi2000'
Write-Host ''
Write-Host 'Login to GitHub Container Registry.'
Write-Host 'Need Personal Access Token (PAT) with read:packages scope.'
$tokenSecure = Read-Host 'GHCR Token' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($tokenSecure)
$TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$TOKEN | docker login ghcr.io -u $GITHUB_OWNER --password-stdin
if ($LASTEXITCODE -ne 0) { Write-Host 'GHCR login failed.' -ForegroundColor Red; exit 1 }

# --- JWT secret (64 hex chars) ---
$JWT_SECRET = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })

# --- Install dir ---
$InstallDir = Join-Path $env:USERPROFILE 'gym-pro'
New-Item -ItemType Directory -Force -Path `
    $InstallDir, `
    (Join-Path $InstallDir 'data\db'), `
    (Join-Path $InstallDir 'backups'), `
    (Join-Path $InstallDir 'system') | Out-Null
Set-Location $InstallDir

# --- Download compose file from chosen branch ---
$composeUrl = "https://raw.githubusercontent.com/$GITHUB_OWNER/gym-pro/$BRANCH/docker-compose.deploy.yml"
Write-Host "Downloading compose from $BRANCH branch..."
try {
    Invoke-WebRequest -UseBasicParsing -Uri $composeUrl -OutFile 'docker-compose.yml'
} catch {
    Write-Host "Could not download compose file. Copy docker-compose.deploy.yml to $InstallDir\docker-compose.yml manually." -ForegroundColor Yellow
    exit 1
}

# --- Write .env ---
$envContent = @"
# GymPro Configuration - $(Get-Date -Format 'yyyy-MM-dd HH:mm')
JWT_SECRET=$JWT_SECRET

GITHUB_OWNER=$GITHUB_OWNER
BRANCH=$BRANCH
IMAGE_TAG=$IMAGE_TAG

SEED_ADMIN_EMAIL=$SEED_EMAIL
SEED_ADMIN_PASSWORD=$SEED_PASSWORD

GYM_NAME=$GYM_NAME
GYM_ADDRESS=$GYM_ADDRESS
GYM_PHONE=$GYM_PHONE

ZKTECO_DEVICE_IP=
ZKTECO_DEVICE_PORT=4370
ATTENDANCE_POLL_INTERVAL_MS=60000

BACKUP_CRON=0 2 * * *
BACKUP_MAX_COUNT=7
GDRIVE_CLIENT_ID=
GDRIVE_CLIENT_SECRET=
GDRIVE_TOKEN=
GDRIVE_FOLDER_ID=
"@
$envContent | Set-Content -Path (Join-Path $InstallDir '.env') -Encoding UTF8
Write-Host "Config saved to $InstallDir\.env"

# --- Pull + start ---
Write-Host ''
Write-Host 'Pulling images (may take a few minutes)...'
docker compose pull
if ($LASTEXITCODE -ne 0) { Write-Host 'docker compose pull failed.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host 'Starting GymPro...'
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host 'docker compose up failed.' -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host 'Waiting for server to start...'
Start-Sleep -Seconds 5

# --- Install host-updater + register Task Scheduler ---
Write-Host ''
Write-Host 'Installing host-updater...'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item -Path (Join-Path $ScriptDir 'host-updater.ps1')  -Destination (Join-Path $InstallDir 'host-updater.ps1')  -Force
Copy-Item -Path (Join-Path $ScriptDir 'update-client.ps1') -Destination (Join-Path $InstallDir 'update-client.ps1') -Force

$TaskName = 'GymProUpdater'
$WatcherPath = Join-Path $InstallDir 'host-updater.ps1'

# Unregister any previous version so re-running setup is idempotent.
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$WatcherPath`""

$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 1) `
    -RepetitionDuration ([TimeSpan]::FromDays(3650))

$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::FromMinutes(30))

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description 'GymPro host updater - polls trigger file and runs update-client.ps1 when the in-app Update button is pressed.' `
    -RunLevel Limited | Out-Null

Write-Host "Task Scheduler entry installed: $TaskName (runs every minute)."

Write-Banner 'GymPro Setup Complete!'
Write-Host "  URL:      http://localhost"
Write-Host "  Login:    $SEED_EMAIL"
Write-Host "  Password: $SEED_PASSWORD"
Write-Host ''
Write-Host "  Gym Name: $GYM_NAME"
Write-Host "  Install:  $InstallDir"
Write-Host "  Branch:   $BRANCH"
Write-Host "  Tag:      $IMAGE_TAG"
Write-Host ''
Write-Host "  To update: powershell -ExecutionPolicy Bypass -File .\update-client.ps1"
Write-Host "  To stop:   docker compose down"
Write-Host "  To start:  docker compose up -d"
Write-Host '======================================'
