# ATLAS B2G - CHUNK worker (PC oportunista). Le scripts\worker.local.env, exporta as envs e
# roda o worker de chunks em loop com auto-restart. Quando o PC esta ligado, ele PUXA pedacos
# da fila atlas_chunks e ajuda as VMs; quando desliga, os chunks travados voltam pra fila
# e uma VM pega. Tudo ADD-only e idempotente -> nada se perde, a base nunca encolhe.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run_chunk_worker.ps1
#
# IMPORTANTE (corrigido 2026-07-06): antes lia .env.local, que e trocado toda hora durante
# build/deploy do site (alterna entre config do mapper e do mapper-full) - como este script
# roda a cada logon do Windows (atalho em Inicializar), toda vez que .env.local estava com a
# config do mapper (banco antigo) no momento do logon, a coleta 24/7 ficava presa no banco
# ERRADO ate alguem perceber (ficou 4 dias assim, de 02/07 a 06/07). Agora usa
# scripts\worker.local.env, um arquivo dedicado que so muda se alguem editar de proposito.
$ErrorActionPreference = "Stop"
$EnvFile = Join-Path $PSScriptRoot "worker.local.env"
if (-not (Test-Path $EnvFile)) { Write-Error "worker.local.env nao encontrado em $PSScriptRoot"; exit 1 }
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    $k = $matches[1]; $v = $matches[2].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($k, $v, "Process")
  }
}
$pipe = $env:ATLAS_PIPELINE_ROOT
if (-not $pipe) { Write-Error "ATLAS_PIPELINE_ROOT ausente no .env.local"; exit 1 }
$py = if ($env:ATLAS_PYTHON) { $env:ATLAS_PYTHON } else { "python" }
Write-Host "[chunk-worker] loop iniciado | pipeline=$pipe"
while ($true) {
  try {
    & $py (Join-Path $pipe "src\atlas_chunk_worker.py")
    $code = $LASTEXITCODE
  } catch {
    $code = 1; Write-Host "[chunk-worker] excecao: $($_.Exception.Message)"
  }
  Write-Host "[chunk-worker] processo encerrou (code=$code). Reiniciando em 10s..."
  Start-Sleep -Seconds 10
}
