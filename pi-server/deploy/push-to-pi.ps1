# Deploy Zenith Frontier pi-server to a SEPARATE folder on the Pi.
# Credentials: pi-server/deploy/.pi-credentials (gitignored)

$ErrorActionPreference = "Stop"

$DeployDir = $PSScriptRoot
$PiServer = (Resolve-Path (Join-Path $DeployDir "..")).Path
$CredFile = Join-Path $DeployDir ".pi-credentials"

if (-not (Test-Path $CredFile)) {
  Write-Error "Missing credentials file. Copy .pi-credentials.example to .pi-credentials"
}

$creds = @{}
Get-Content $CredFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  if ($_ -match '^\s*([^=]+)=(.*)$') {
    $creds[$Matches[1].Trim()] = $Matches[2].Trim()
  }
}

$PiHost = $creds['PI_HOST']
$PiUser = $creds['PI_USER']
$PiPassword = $creds['PI_PASSWORD']
$RemoteDir = $creds['PI_REMOTE_DIR']
$KeyPath = Join-Path $env:USERPROFILE ".ssh\zenith_pi"

if (-not $PiHost -or -not $PiUser -or -not $RemoteDir) {
  Write-Error "PI_HOST, PI_USER, PI_REMOTE_DIR required in .pi-credentials"
}

Write-Host ("SSH {0}@{1} -> {2}" -f $PiUser, $PiHost, $RemoteDir)
ssh -i $KeyPath -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes ($PiUser + "@" + $PiHost) ("mkdir -p " + $RemoteDir + "; echo ok")
if ($LASTEXITCODE -ne 0) {
  Write-Error "SSH failed. Key must be in authorized_keys on the Pi."
}

$Tar = Join-Path $env:TEMP "zenith-frontier-pi.tgz"
if (Test-Path $Tar) { Remove-Item $Tar -Force }
Push-Location $PiServer
tar -czf $Tar --exclude=node_modules --exclude=data --exclude=dist --exclude=.git .
Pop-Location

scp -i $KeyPath -o IdentitiesOnly=yes $Tar ($PiUser + "@" + $PiHost + ":/tmp/zenith-frontier-pi.tgz")
if ($LASTEXITCODE -ne 0) { Write-Error "scp failed" }

$PwEsc = $PiPassword.Replace("'", "'\''")
$RemoteSh = Join-Path $env:TEMP "zenith-pi-remote.sh"
$lines = @(
  '#!/bin/bash'
  'set -e'
  'export DEBIAN_FRONTEND=noninteractive'
  ("REMOTE_DIR='" + $RemoteDir + "'")
  ("PW='" + $PwEsc + "'")
  ''
  'sudo_cmd() {'
  '  if sudo -n true 2>/dev/null; then'
  '    sudo "$@"'
  '  else'
  '    echo "$PW" | sudo -S "$@"'
  '  fi'
  '}'
  ''
  'if ! command -v node >/dev/null 2>&1; then'
  '  echo "[deploy] Installing Node.js from apt (armhf)..."'
  '  sudo_cmd apt-get update -y'
  '  sudo_cmd apt-get install -y nodejs npm build-essential python3'
  'fi'
  'node -v'
  'npm -v'
  ''
  'mkdir -p "$REMOTE_DIR"'
  'cd "$REMOTE_DIR"'
  'tar -xzf /tmp/zenith-frontier-pi.tgz'
  'rm -f /tmp/zenith-frontier-pi.tgz'
  ''
  'if [ ! -f .env ]; then'
  '  echo "MISSING .env on Pi"'
  '  exit 2'
  'fi'
  ''
  'npm install'
  ''
  'sudo_cmd cp deploy/zenith-frontier-pi.service /etc/systemd/system/zenith-frontier-pi.service'
  'sudo_cmd systemctl daemon-reload'
  'sudo_cmd systemctl enable zenith-frontier-pi'
  'sudo_cmd systemctl restart zenith-frontier-pi'
  'sleep 2'
  'curl -s http://127.0.0.1:8788/health || true'
  'echo'
  'sudo_cmd systemctl --no-pager status zenith-frontier-pi | head -25'
)
[System.IO.File]::WriteAllLines($RemoteSh, $lines)

scp -i $KeyPath -o IdentitiesOnly=yes $RemoteSh ($PiUser + "@" + $PiHost + ":/tmp/zenith-pi-remote.sh")
ssh -i $KeyPath -o IdentitiesOnly=yes -o BatchMode=yes ($PiUser + "@" + $PiHost) "sed -i 's/\r$//' /tmp/zenith-pi-remote.sh; bash /tmp/zenith-pi-remote.sh"
if ($LASTEXITCODE -ne 0) { Write-Error ("Remote deploy failed exit " + $LASTEXITCODE) }

Write-Host ("Done. API: http://{0}:8788/health" -f $PiHost)
Write-Host ("Frontend: NEXT_PUBLIC_API_URL=http://{0}:8788" -f $PiHost)
