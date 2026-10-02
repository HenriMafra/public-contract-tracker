#!/usr/bin/env bash
# ATLAS B2G - Instala o worker como servico systemd (always-on + auto-restart) no host Linux.
# Uso:  bash scripts/oracle_worker_service_medflow.sh
set -euo pipefail

APP_DIR="${ATLAS_APP_DIR:-/opt/atlas-b2g-online}"
PIPE_DIR="${ATLAS_PIPELINE_ROOT:-/opt/ATLAS-PNCP-Pilot}"
SVC_USER="${ATLAS_SVC_USER:-$USER}"
PY="$PIPE_DIR/.venv/bin/python"; [ -x "$PY" ] || PY="/usr/bin/python3"
UNIT="/etc/systemd/system/atlas-worker.service"

echo "Criando $UNIT (EnvironmentFile=$APP_DIR/.env.local)"
sudo tee "$UNIT" >/dev/null <<EOF
[Unit]
Description=ATLAS B2G Worker (fila atlas_jobs / Supabase MedFlow)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SVC_USER
WorkingDirectory=$PIPE_DIR
EnvironmentFile=$APP_DIR/.env.local
ExecStart=$PY src/atlas_job_worker.py --loop --interval 5
Restart=always
RestartSec=5
StandardOutput=append:/var/log/atlas-worker.log
StandardError=append:/var/log/atlas-worker.log

[Install]
WantedBy=multi-user.target
EOF

sudo touch /var/log/atlas-worker.log && sudo chown "$SVC_USER" /var/log/atlas-worker.log || true
sudo chmod 600 "$APP_DIR/.env.local" || true
sudo systemctl daemon-reload
sudo systemctl enable --now atlas-worker
sleep 2
sudo systemctl --no-pager status atlas-worker | head -8
echo ""
echo "Logs:    journalctl -u atlas-worker -f   (ou tail -f /var/log/atlas-worker.log)"
echo "Update:  git -C $APP_DIR pull && git -C $PIPE_DIR pull && sudo systemctl restart atlas-worker"
echo "Parar:   sudo systemctl stop atlas-worker"
