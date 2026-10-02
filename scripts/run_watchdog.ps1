# ATLAS B2G - Watchdog da coleta 24/7 (2026-07-06).
# Roda em loop continuo (a cada 10 min) via atalho na pasta Inicializar do Windows (nao
# precisa de permissao elevada, ao contrario de uma Tarefa Agendada nova). Verifica:
#   1) Chunk preso em 'running' ha muito tempo (processo travado sem crashar) -> reenfileira.
#   2) Nenhum processo atlas_chunk_worker.py vivo (processo morreu) -> reinicia via run_chunkworker.ps1.
# Sempre AVISA dentro do proprio site (insere em public.notificacoes, perfil_destino=Administrador)
# quando faz uma correcao - nao fica silencioso feito antes (2026-07-02 a 2026-07-06 ficou 4 dias
# parado sem ninguem perceber).
$ErrorActionPreference = "Continue"
$EnvFile = Join-Path $PSScriptRoot "worker.local.env"
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim().Trim('"').Trim("'"), "Process")
  }
}
$LIMIAR_MIN = 45     # chunk rodando ha mais que isso = considerado travado
$INTERVALO_SEG = 600 # verifica a cada 10 min

function Log($msg) {
  $linha = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [watchdog] $msg"
  Write-Host $linha
  try { Add-Content -Path (Join-Path $env:ATLAS_PIPELINE_ROOT "logs\watchdog.log") -Value $linha } catch {}
}

function Notificar($titulo, $mensagem) {
  $py = $env:ATLAS_PYTHON
  $script = @"
import os
try:
    import psycopg2
except Exception:
    import psycopg as psycopg2
cn = psycopg2.connect(os.environ['DATABASE_URL']); cn.autocommit = True; cur = cn.cursor()
cur.execute("insert into notificacoes (tipo, titulo, mensagem, nivel, perfil_destino, escopo, criada_por) values (%s,%s,%s,%s,%s,%s,%s)",
  ('sistema', '''$titulo''', '''$mensagem''', 'aviso', 'Administrador', 'global', 'watchdog'))
cn.close()
"@
  $tmp = [System.IO.Path]::GetTempFileName() + ".py"
  Set-Content -Path $tmp -Value $script -Encoding utf8
  try { & $py $tmp } catch { Log "falha ao notificar: $($_.Exception.Message)" }
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

function VerificarUmaVez {
  $py = $env:ATLAS_PYTHON
  $checkScript = @"
import os
try:
    import psycopg2
except Exception:
    import psycopg as psycopg2
cn = psycopg2.connect(os.environ['DATABASE_URL']); cn.autocommit = True; cur = cn.cursor()
cur.execute("select id, uf, started_at from atlas_chunks where status='running' and started_at < now() - interval '$LIMIAR_MIN minutes'")
presos = cur.fetchall()
for cid, uf, started in presos:
    cur.execute("update atlas_chunks set status='queued', locked_by=null, locked_at=null, started_at=null where id=%s", (cid,))
    print(f"REQUEUE {cid} {uf} {started}")
cn.close()
"@
  $tmp = [System.IO.Path]::GetTempFileName() + ".py"
  Set-Content -Path $tmp -Value $checkScript -Encoding utf8
  $saida = & $py $tmp 2>&1
  Remove-Item $tmp -ErrorAction SilentlyContinue

  if ($saida -match "REQUEUE") {
    $linhas = $saida -split "`n" | Where-Object { $_ -match "REQUEUE" }
    Log "chunk(s) travado(s) reenfileirado(s): $($linhas -join ' | ')"
    Notificar "Coleta: chunk travado corrigido" "O watchdog encontrou $($linhas.Count) chunk(s) parado(s) ha mais de $LIMIAR_MIN min e recolocou na fila automaticamente."
  }

  $vivo = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*atlas_chunk_worker.py*" }
  if (-not $vivo) {
    Log "atlas_chunk_worker.py NAO esta rodando - reiniciando via run_chunkworker.ps1"
    Start-Process -WindowStyle Hidden -FilePath "powershell.exe" `
      -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\run_chunk_worker.ps1`""
    Notificar "Coleta: worker reiniciado" "O processo de coleta (atlas_chunk_worker.py) tinha parado de rodar. O watchdog reiniciou automaticamente."
  } else {
    Log "OK - worker vivo (PID $($vivo.ProcessId -join ',')), nenhum chunk travado"
  }
}

Log "watchdog iniciado (verifica a cada $($INTERVALO_SEG/60) min, limiar de travamento = $LIMIAR_MIN min)"
while ($true) {
  try { VerificarUmaVez } catch { Log "erro na verificacao: $($_.Exception.Message)" }
  Start-Sleep -Seconds $INTERVALO_SEG
}
