<#
  ATLAS B2G — Remove o worker (serviço NSSM ou tarefa agendada).
    powershell -ExecutionPolicy Bypass -File scripts\remove_worker_service.ps1
#>
$ErrorActionPreference = "SilentlyContinue"
$task = "ATLAS_B2G_Worker"
$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssm) {
  & nssm stop $task
  & nssm remove $task confirm
  Write-Host "[OK] Serviço NSSM '$task' removido (se existia)." -ForegroundColor Green
}
$out = schtasks /Delete /TN $task /F 2>&1
Write-Host "[OK] Tarefa agendada '$task' removida (se existia)." -ForegroundColor Green
