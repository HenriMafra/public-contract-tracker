<#
  ATLAS B2G Online — Orquestrador de GO-LIVE (Windows / PowerShell)
  Encadeia: preflight -> aplica SQL no Supabase -> cria admin -> carrega rodada -> valida.

  Uso (na pasta atlas-b2g-online):
    .\scripts\go_live.ps1 -AdminEmail admin@empresa.com -AdminPassword "SenhaForte!" -AdminNome "Admin" `
                          -Rodada "C:\Users\henri\Desktop\ATLAS-PNCP-Pilot\outputs\rodadas\PRODUCAO_2026-05-31"

  Pré-requisito: .env.local preenchido com as chaves REAIS do Supabase (rode antes: npm run doctor).
#>
param(
  [Parameter(Mandatory=$true)][string]$AdminEmail,
  [Parameter(Mandatory=$true)][string]$AdminPassword,
  [string]$AdminNome = "Administrador",
  [string]$Rodada = "",
  [switch]$SkipLoad
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Read-DotEnv($path) {
  $h = @{}
  if (Test-Path $path) {
    foreach ($line in Get-Content $path) {
      if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $h[$Matches[1]] = $Matches[2].Trim('"').Trim("'") }
    }
  }
  return $h
}

Write-Host "`n=== [1/5] Preflight (doctor) ===" -ForegroundColor Cyan
node scripts/doctor.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "Preflight falhou. Corrija o .env.local e tente de novo." -ForegroundColor Red; exit 1 }

Write-Host "`n=== [2/5] Aplicando SQL no Supabase (schema, seed, rls, storage) ===" -ForegroundColor Cyan
$py = (Read-DotEnv "$root\.env.local")["ATLAS_PYTHON"]; if (-not $py) { $py = "python" }
& $py scripts/apply_supabase_sql.py
if ($LASTEXITCODE -ne 0) { Write-Host "Falha ao aplicar SQL." -ForegroundColor Red; exit 1 }

Write-Host "`n=== [3/5] Criando/atualizando o primeiro Administrador ===" -ForegroundColor Cyan
npx tsx scripts/create_admin_user.ts --email $AdminEmail --password $AdminPassword --role Administrador --nome $AdminNome
if ($LASTEXITCODE -ne 0) { Write-Host "Falha ao criar admin." -ForegroundColor Red; exit 1 }

if (-not $SkipLoad) {
  $env2 = Read-DotEnv "$root\.env.local"
  $pipe = $env2["ATLAS_PIPELINE_ROOT"]; if (-not $pipe) { $pipe = $env2["ATLAS_PIPELINE_DIR"] }
  $dburl = $env2["DATABASE_URL"]
  if (-not $Rodada) {
    # pega a rodada de produção mais recente, se existir
    $rd = Join-Path $pipe "outputs\rodadas"
    if (Test-Path $rd) {
      $cand = Get-ChildItem $rd -Directory | Where-Object { $_.Name -like "PRODUCAO_*" } | Sort-Object Name -Descending | Select-Object -First 1
      if ($cand) { $Rodada = $cand.FullName }
    }
  }
  if ($pipe -and $dburl -and $Rodada) {
    Write-Host "`n=== [4/5] Carregando rodada real no banco ===" -ForegroundColor Cyan
    Write-Host "  rodada: $Rodada"
    Push-Location $pipe
    & $py src/load_weekly_to_db.py --rodada $Rodada --db-url $dburl --no-init
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { Write-Host "Falha na carga da rodada." -ForegroundColor Red; exit 1 }
  } else {
    Write-Host "`n=== [4/5] Carga PULADA (defina ATLAS_PIPELINE_ROOT, DATABASE_URL e -Rodada) ===" -ForegroundColor Yellow
  }
} else {
  Write-Host "`n=== [4/5] Carga PULADA (-SkipLoad) ===" -ForegroundColor Yellow
}

Write-Host "`n=== [5/5] Concluído ===" -ForegroundColor Green
Write-Host "Suba o app:  npm run dev   (ou: npm run build; npm start)"
Write-Host "Login:       $AdminEmail"
Write-Host "Valide:      Dashboard -> Lista de Ataque -> Ficha -> Admin/Operação -> Auditoria"
Write-Host "Crie os demais usuários em Admin -> Usuários (ou com create_admin_user.ts --role ... --vendedor-nome ...)."
