# [Windows PowerShell] Generate a random SEARXNG_SECRET and write it into .env.
# Usage (from the project folder):  .\scripts\new-secret.ps1
# The secret is never printed on screen.
# If PowerShell blocks scripts, run once:  Set-ExecutionPolicy -Scope Process Bypass

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $root ".env.example") $envFile
    Write-Host "Created .env from .env.example"
}

# 32 random bytes from the OS cryptographic generator -> 64 hex characters
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })

$lines = Get-Content $envFile
if ($lines -match '^SEARXNG_SECRET=') {
    $lines = $lines -replace '^SEARXNG_SECRET=.*$', "SEARXNG_SECRET=$secret"
} else {
    $lines += "SEARXNG_SECRET=$secret"
}
[System.IO.File]::WriteAllLines($envFile, $lines)

Write-Host "New SEARXNG_SECRET written to .env (64 hex characters, not shown)."
Write-Host "Restart to apply:  docker compose up -d"
