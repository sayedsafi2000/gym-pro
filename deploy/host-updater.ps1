# GymPro — Host Updater (Windows)
#
# Installed by setup-client.ps1 to $HOME\gym-pro\host-updater.ps1.
# Launched every 60s by Windows Task Scheduler.
#
# Polls $HOME\gym-pro\system\update-requested.json. When present:
#   1. Write update-status.json { state: "running" }
#   2. Delete trigger file
#   3. Run update-client.ps1 (full PowerShell, no bash dependency)
#   4. Write update-status.json { state: "done" | "failed" }
#
# Touches update-status.json every tick so the UI can tell the watcher is alive.

$ErrorActionPreference = 'Continue'

$InstallDir   = Join-Path $env:USERPROFILE 'gym-pro'
$SystemDir    = Join-Path $InstallDir 'system'
$Trigger      = Join-Path $SystemDir  'update-requested.json'
$Status       = Join-Path $SystemDir  'update-status.json'
$Lock         = Join-Path $SystemDir  '.updating'
$LogFile      = Join-Path $SystemDir  'update.log'
$UpdateScript = Join-Path $InstallDir 'update-client.ps1'

New-Item -ItemType Directory -Force -Path $SystemDir | Out-Null

function Write-Status([string]$json) {
    Set-Content -Path $Status -Value $json -Encoding UTF8 -NoNewline
}

function Append-Log([string]$line) {
    $ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    Add-Content -Path $LogFile -Value "[$ts] $line" -Encoding UTF8
}

# Heartbeat: always touch status so watcher-health endpoint sees fresh mtime.
if (-not (Test-Path $Status)) {
    Write-Status '{"state":"idle"}'
} else {
    (Get-Item $Status).LastWriteTime = Get-Date
}

if (-not (Test-Path $Trigger)) { exit 0 }
if (Test-Path $Lock) { exit 0 }
New-Item -ItemType File -Path $Lock -Force | Out-Null

$Started = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
Write-Status "{`"state`":`"running`",`"startedAt`":`"$Started`"}"
Remove-Item $Trigger -Force -ErrorAction SilentlyContinue

Append-Log "Update triggered. Running $UpdateScript"

try {
    Set-Location $InstallDir
    & powershell.exe -ExecutionPolicy Bypass -NoProfile -File $UpdateScript *>> $LogFile
    if ($LASTEXITCODE -ne 0) { throw "update-client.ps1 exited $LASTEXITCODE" }

    $Finished = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Write-Status "{`"state`":`"done`",`"startedAt`":`"$Started`",`"finishedAt`":`"$Finished`"}"
    Append-Log 'Update complete.'
} catch {
    $Finished = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $err = ($_.Exception.Message -replace '"', '\"' -replace '\\', '\\')
    Write-Status "{`"state`":`"failed`",`"startedAt`":`"$Started`",`"finishedAt`":`"$Finished`",`"error`":`"$err — see update.log`"}"
    Append-Log "Update FAILED: $($_.Exception.Message)"
} finally {
    Remove-Item $Lock -Force -ErrorAction SilentlyContinue
}
