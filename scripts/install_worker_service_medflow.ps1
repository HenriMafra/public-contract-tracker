# ATLAS B2G - Registra o worker como Tarefa Agendada (Windows) always-on, com auto-restart.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install_worker_service_medflow.ps1
# Elevado (Admin): tarefa AtStartup (roda mesmo sem login) + RunLevel Highest.
# Sem elevacao:    tarefa AtLogOn no escopo do usuario (roda ao logar) - nao precisa de admin.
$ErrorActionPreference = "Stop"
$Task   = "ATLAS-B2G-Worker-MedFlow"
$runner = Join-Path $PSScriptRoot "run_worker_medflow.ps1"
if (-not (Test-Path $runner)) { Write-Error "run_worker_medflow.ps1 nao encontrado"; exit 1 }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
           -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
            -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
            -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

if ($isAdmin) {
  $trigger = New-ScheduledTaskTrigger -AtStartup
  Register-ScheduledTask -TaskName $Task -Action $action -Trigger $trigger -Settings $settings `
    -Description "ATLAS B2G worker (fila atlas_jobs / Supabase MedFlow) - AtStartup" -RunLevel Highest -Force | Out-Null
  Write-Host "Tarefa '$Task' registrada (Admin): AtStartup + auto-restart."
} else {
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  Register-ScheduledTask -TaskName $Task -Action $action -Trigger $trigger -Settings $settings `
    -Description "ATLAS B2G worker (fila atlas_jobs / Supabase MedFlow) - AtLogOn (usuario)" -Force | Out-Null
  Write-Host "Tarefa '$Task' registrada (usuario, sem elevacao): AtLogOn + auto-restart."
  Write-Host "Para rodar no boot sem login, reabra como Admin e rode este script novamente."
}

Write-Host "Iniciar agora:   Start-ScheduledTask -TaskName $Task"
Write-Host "Status:          Get-ScheduledTask -TaskName $Task | Get-ScheduledTaskInfo"
Write-Host "Parar:           Stop-ScheduledTask  -TaskName $Task"
Write-Host "Remover:         Unregister-ScheduledTask -TaskName $Task -Confirm:`$false"
