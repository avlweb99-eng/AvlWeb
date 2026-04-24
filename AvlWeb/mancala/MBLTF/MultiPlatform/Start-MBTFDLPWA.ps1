param(
    [int]$Port = 4173,
    [switch]$NoBrowser
)

Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $root 'serve-pwa.cjs'

if (-not (Test-Path -LiteralPath $serverScript)) {
    throw "The PWA server script was not found: $serverScript"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js was not found on this machine. Install Node.js to launch the PWA server.'
}

$arguments = @($serverScript, '--port', [string]$Port)
if (-not $NoBrowser) {
    $arguments += '--open'
}

Write-Host "Launching Mancala Bot Lab Training Facility PWA..." -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor White
Write-Host "Node: $($node.Source)" -ForegroundColor White
Write-Host ""

Push-Location $root
try {
    & $node.Source @arguments
    exit $LASTEXITCODE
} catch {
    Write-Host "Launcher error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
