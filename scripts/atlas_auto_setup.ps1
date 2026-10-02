<#
  ATLAS B2G — Entry-point de automação (Windows).
    powershell -ExecutionPolicy Bypass -File scripts\atlas_auto_setup.ps1 -Mode full
  Garante Python (e venv se -UseVenv), instala deps mínimas e delega ao orquestrador Python.
#>
param(
  [ValidateSet("full","local","cloud","validate","repair")][string]$Mode = "full",
  [switch]$Resume,
  [switch]$UseVenv
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Find-Python {
  foreach ($c in @($env:ATLAS_PYTHON, "python", "py")) {
    if ($c) { $p = (Get-Command $c -ErrorAction SilentlyContinue); if ($p) { return $p.Source } }
  }
  return $null
}
$py = Find-Python
if (-not $py) { Write-Host "[X] Python não encontrado. Instale Python 3.10+ (https://python.org)." -ForegroundColor Red; exit 1 }
Write-Host "[i] Python: $py" -ForegroundColor Cyan

if ($UseVenv) {
  $venv = Join-Path $root ".venv"
  if (-not (Test-Path "$venv\Scripts\python.exe")) { Write-Host "[i] criando venv .venv…"; & $py -m venv $venv }
  $py = Join-Path $venv "Scripts\python.exe"
  Write-Host "[i] usando venv: $py" -ForegroundColor Cyan
}

# deps mínimas (idempotente; silencioso)
& $py -m pip install --quiet psycopg2-binary requests openpyxl 2>$null

# delega ao orquestrador
$argv = @("scripts\atlas_auto_setup.py", "--mode", $Mode)
if ($Resume) { $argv += "--resume" }
Write-Host "[i] $py $($argv -join ' ')" -ForegroundColor Cyan
& $py @argv
exit $LASTEXITCODE
