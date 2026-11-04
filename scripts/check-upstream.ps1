# [Windows PowerShell] After "docker compose pull", check whether SearXNG changed
# any template that Tern overrides.
# Usage (from the project folder):  .\scripts\check-upstream.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$image = "docker.io/searxng/searxng:latest"
$files = "base.html", "index.html", "page_with_header.html", "manifest.json", "searxng-wordmark.min.svg"
$changed = $false

Write-Host "Snapshot taken from: $(Get-Content (Join-Path $root 'theme\upstream-snapshot\VERSION'))"

foreach ($f in $files) {
    $snapshot = Get-Content (Join-Path $root "theme\upstream-snapshot\$f")
    $current = docker run --rm --entrypoint cat $image "/usr/local/searxng/searx/templates/simple/$f"
    $diff = Compare-Object $snapshot $current
    if ($diff) {
        $changed = $true
        Write-Host "CHANGED    $f   (re-apply the TERN lines to theme\templates\$f)" -ForegroundColor Yellow
        $diff | Format-Table -AutoSize | Out-String | Write-Host
    } else {
        Write-Host "unchanged  $f"
    }
}

if (-not $changed) { Write-Host "All overridden templates match the snapshot. Safe to keep the theme as is." -ForegroundColor Green }
