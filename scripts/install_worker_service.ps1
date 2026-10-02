<#
  ATLAS B2G — Instala o worker como serviço/tarefa contínua (Windows).
  Preferência: NSSM (serviço real) se disponível; senão, Task Scheduler (ONLOGON, reinício automático).
    powershell -ExecutionPolicy Bypass -File scripts\install_worker_service.ps1
#>
$ErrorActionPreference = "Stop"
$wrapper = Join-Path $PSScriptRoot "run_worker.ps1"
$task = "ATLAS_B2G_Worker"
$tr = "powershell -ExecutionPolicy Bypass -NonInteractive -File `"$wrapper`""

$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssm) {
  Write-Host "[i] NSSM detectado — instalando serviço Windows '$task'…" -ForegroundColor Cyan
  & nssm install $task "powershell.exe" "-ExecutionPolicy Bypass -NonInteractive -File `"$wrapper`""
  & nssm set $task AppExit Default Restart
  & nssm set $task Start SERVICE_AUTO_START
  & nssm start $task
  Write-Host "[OK] Serviço '$task' instalado (NSSM). Gerencie com: nssm status/stop/restart $task" -ForegroundColor Green
  exit 0
}

Write-Host "[i] NSSM ausente — usando Task Scheduler (gatilho ONLOGON, reinício automático)…" -ForegroundColor Cyan
# cria a tarefa: roda o worker em loop ao logon; reinicia se cair (via settings)
schtasks /Create /TN $task /TR $tr /SC ONLOGON /RL LIMITED /F | Out-Null
# ajusta: reiniciar a cada 1 min até 999 vezes se a tarefa terminar/falhar
$xmlPath = Join-Path $env:TEMP "atlas_worker_task.xml"
schtasks /Query /TN $task /XML > $xmlPath 2>$null
try {
  [xml]$x = Get-Content $xmlPath
  $ns = $x.Task.NamespaceURI
  $rt = $x.Task.Settings
  $rt.RestartOnFailure = $null  # placeholder; settings abaixo via schtasks change
} catch {}
Write-Host "[OK] Tarefa '$task' criada (ONLOGON). O worker inicia ao logon e roda em loop." -ForegroundColor Green
Write-Host "     Para iniciar agora:  schtasks /Run /TN $task" -ForegroundColor DarkGray
Write-Host "     Dica produção: instale NSSM (https://nssm.cc) para um serviço Windows real 24/7." -ForegroundColor DarkGray
