# ATLAS B2G - Worker runner (banco do mapper-full / abhlinzbzinanxzyqtmz).
# Le scripts\worker.local.env (dedicado, NAO o .env.local do Next.js) e roda o worker da fila
# em loop, com auto-restart. Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_worker_medflow.ps1
#
# IMPORTANTE (corrigido 2026-07-06): antes lia .env.local, que e trocado toda hora durante
# build/deploy do site (alterna entre config do mapper e do mapper-full) - toda vez que
# .env.local voltava pro banco do mapper, essa tarefa reiniciava o worker no banco ERRADO.
# Agora usa scripts\worker.local.env, um arquivo dedicado que so muda se alguem editar
# de proposito. NUNCA troque esta linha de volta pra apontar pro .env.local.
$ErrorActionPreference = "Stop"
$Online  = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $PSScriptRoot "worker.local.env"
if (-not (Test-Path $EnvFile)) { Write-Error "worker.local.env nao encontrado em $PSScriptRoot"; exit 1 }

# Carrega variaveis do .env.local para o processo (nunca imprime valores)
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $k = $matches[1]; $v = $matches[2].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($k, $v, "Process")
  }
}
$pipe = $env:ATLAS_PIPELINE_ROOT
if (-not $pipe) { Write-Error "ATLAS_PIPELINE_ROOT ausente no .env.local"; exit 1 }
$py = if ($env:ATLAS_PYTHON) { $env:ATLAS_PYTHON } else { "python" }
$dbState = if ($env:DATABASE_URL) { "definido" } else { "AUSENTE" }
Write-Host "[worker] loop iniciado | pipeline=$pipe | DATABASE_URL=$dbState"

# Loop com auto-restart (o worker --loop ja faz polling; isto cobre crashes do processo)
while ($true) {
  try {
    & $py (Join-Path $pipe "src\atlas_job_worker.py") --loop --interval 5
    $code = $LASTEXITCODE
  } catch {
    $code = 1; Write-Host "[worker] excecao: $($_.Exception.Message)"
  }
  Write-Host "[worker] processo encerrou (code=$code). Reiniciando em 5s..."
  Start-Sleep -Seconds 5
}
