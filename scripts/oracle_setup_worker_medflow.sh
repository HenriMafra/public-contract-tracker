#!/usr/bin/env bash
# ATLAS B2G - Setup do host (Oracle Free Tier / Ubuntu) para o worker da fila MedFlow.
# Instala Python/Git, clona o pipeline + o online, instala deps. NAO grava segredos.
# Uso:  bash scripts/oracle_setup_worker_medflow.sh
set -euo pipefail

APP_DIR="${ATLAS_APP_DIR:-/opt/atlas-b2g-online}"
PIPE_DIR="${ATLAS_PIPELINE_ROOT:-/opt/ATLAS-PNCP-Pilot}"
APP_REPO="${ATLAS_APP_REPO:-https://github.com/HenriMafra/atlas-b2g-online.git}"
APP_BRANCH="${ATLAS_APP_BRANCH:-go-live/supabase-medflow}"
# PIPE_REPO deve apontar para o repo do pipeline PNCP (defina ATLAS_PIPELINE_REPO)
PIPE_REPO="${ATLAS_PIPELINE_REPO:-}"

echo "[1/5] Pacotes base (python3, venv, pip, git)"
sudo apt-get update -y
sudo apt-get install -y python3 python3-venv python3-pip git

echo "[2/5] Clonar/atualizar o app ($APP_BRANCH)"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else sudo mkdir -p "$APP_DIR" && sudo chown "$USER" "$APP_DIR" && git clone -b "$APP_BRANCH" "$APP_REPO" "$APP_DIR"; fi

echo "[3/5] Clonar/atualizar o pipeline PNCP"
if [ -n "$PIPE_REPO" ]; then
  if [ -d "$PIPE_DIR/.git" ]; then git -C "$PIPE_DIR" pull --ff-only; else sudo mkdir -p "$PIPE_DIR" && sudo chown "$USER" "$PIPE_DIR" && git clone "$PIPE_REPO" "$PIPE_DIR"; fi
else
  echo "  ATLAS_PIPELINE_REPO nao definido — copie o pipeline manualmente para $PIPE_DIR"
fi

echo "[4/5] venv + dependencias do worker (psycopg2, etc.)"
python3 -m venv "$PIPE_DIR/.venv"
"$PIPE_DIR/.venv/bin/pip" install --quiet --upgrade pip
"$PIPE_DIR/.venv/bin/pip" install --quiet psycopg2-binary requests
[ -f "$PIPE_DIR/requirements.txt" ] && "$PIPE_DIR/.venv/bin/pip" install --quiet -r "$PIPE_DIR/requirements.txt" || true

echo "[5/5] .env do worker (NUNCA commitado)"
ENVF="$APP_DIR/.env.local"
if [ ! -f "$ENVF" ]; then
  cat > "$ENVF" <<'EOF'
# Preencha com os valores reais (NUNCA commitar). Permissao 600.
DATABASE_URL=postgresql://postgres.hgczpdwhjqaqiravorrg:SUA_SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=https://hgczpdwhjqaqiravorrg.supabase.co
ATLAS_PIPELINE_ROOT=/opt/ATLAS-PNCP-Pilot
ATLAS_DEFAULT_TAG=PRODUCAO
ATLAS_DEFAULT_CONFIG=config/atlas_config_producao.json
EOF
  chmod 600 "$ENVF"
  echo "  criado $ENVF (PREENCHA DATABASE_URL/SERVICE_ROLE e rode chmod 600)"
else
  echo "  $ENVF ja existe — mantido"
fi
echo "OK setup. Proximo: bash scripts/oracle_worker_service_medflow.sh"
