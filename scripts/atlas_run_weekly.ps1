<#
  ATLAS B2G — Wrapper da rodada semanal (chamado pelo agendador).
  Lê o .env.local em runtime (segredo NÃO fica na definição da tarefa) e roda o pipeline com --write-db.
#>
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.local"
$cfg = @{}
if (Test-Path $envFile) {
  foreach ($l in Get-Content $envFile) { if ($l -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $cfg[$Matches[1]] = $Matches[2].Trim('"').Trim("'") } }
}
$pipe = $cfg["ATLAS_PIPELINE_ROOT"]; if (-not $pipe) { $pipe = $cfg["ATLAS_PIPELINE_DIR"] }
$py = $cfg["ATLAS_PYTHON"]; if (-not $py) { $py = "python" }
$conf = $cfg["ATLAS_DEFAULT_CONFIG"]; if (-not $conf) { $conf = "config/atlas_config_producao.json" }
$tag = $cfg["ATLAS_DEFAULT_TAG"]; if (-not $tag) { $tag = "PRODUCAO" }
$dburl = $cfg["DATABASE_URL"]
$logDir = Join-Path $root "outputs\logs"; New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$log = Join-Path $logDir "weekly_$stamp.log"
Push-Location $pipe
$args = @("src/atlas_weekly_runner.py", "--config", $conf, "--tag", $tag, "--write-db")
if ($dburl) { $args += @("--db-url", $dburl) }
"[{0}] iniciando rodada semanal ATLAS (tag={1})" -f (Get-Date), $tag | Tee-Object -FilePath $log
& $py @args *>&1 | Tee-Object -FilePath $log -Append
$code = $LASTEXITCODE
Pop-Location
"[{0}] fim (exit={1})" -f (Get-Date), $code | Tee-Object -FilePath $log -Append
exit $code
