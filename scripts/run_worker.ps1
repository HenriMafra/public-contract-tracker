<#
  ATLAS B2G — Worker da fila (manual).
    powershell -ExecutionPolicy Bypass -File scripts\run_worker.ps1            # loop
    powershell -ExecutionPolicy Bypass -File scripts\run_worker.ps1 -Once      # 1 job
  Lê o .env.local em runtime (DATABASE_URL/ATLAS_PIPELINE_ROOT/ATLAS_PYTHON).
#>
param([switch]$Once, [double]$Interval = 5)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$cfg = @{}
$envFile = Join-Path $root ".env.local"
if (Test-Path $envFile) { foreach ($l in Get-Content $envFile) { if ($l -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $cfg[$Matches[1]] = $Matches[2].Trim('"').Trim("'") } } }
$pipe = $cfg["ATLAS_PIPELINE_ROOT"]; if (-not $pipe) { $pipe = $cfg["ATLAS_PIPELINE_DIR"] }
$py = $cfg["ATLAS_PYTHON"]; if (-not $py) { $py = "python" }
if (-not $pipe) { Write-Host "[X] ATLAS_PIPELINE_ROOT ausente no .env.local" -ForegroundColor Red; exit 1 }
$mode = if ($Once) { "--once" } else { "--loop" }
Write-Host "[i] worker $mode (pipeline: $pipe)" -ForegroundColor Cyan
Push-Location $pipe
& $py "src/atlas_job_worker.py" $mode "--interval" $Interval
$code = $LASTEXITCODE
Pop-Location
exit $code
