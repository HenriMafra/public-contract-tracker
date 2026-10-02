-- =====================================================================
-- ATLAS B2G — Fila de Jobs (Opção B) — Schema
-- Postgres/Supabase em produção; compatível com SQLite (tradução em atlas_db.py).
-- Rode após schema_atlas_b2g.sql. Idempotente.
-- =====================================================================

-- ------------------------- JOBS -------------------------
CREATE TABLE IF NOT EXISTS atlas_jobs (
  id                 BIGSERIAL PRIMARY KEY,
  job_type           TEXT NOT NULL,                 -- run_test|run_production|run_production_write_db|load_round_to_db|generate_package|update_prototype|validate_online|auto_setup|apply_sql|create_users
  status             TEXT NOT NULL DEFAULT 'queued',-- queued|running|success|failed|cancelled|timeout|retrying
  requested_by       TEXT,
  requested_by_email TEXT,
  requested_by_role  TEXT,
  mode               TEXT,
  tag                TEXT,
  config_path        TEXT,
  write_db           BOOLEAN DEFAULT FALSE,
  parameters_json    JSONB,
  priority           INTEGER DEFAULT 5,             -- maior = mais prioritário
  progress_percent   INTEGER DEFAULT 0,
  current_step       TEXT,
  retries            INTEGER DEFAULT 0,
  max_retries        INTEGER DEFAULT 0,
  locked_by          TEXT,                          -- worker que reservou o job
  locked_at          TIMESTAMPTZ,
  started_at         TIMESTAMPTZ,
  finished_at        TIMESTAMPTZ,
  duration_seconds   NUMERIC(12,2),
  exit_code          INTEGER,
  result_json        JSONB,
  error_message      TEXT,
  output_path        TEXT,
  cancel_requested   BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------- LOGS DO JOB -------------------------
CREATE TABLE IF NOT EXISTS atlas_job_logs (
  id           BIGSERIAL PRIMARY KEY,
  job_id       BIGINT REFERENCES atlas_jobs(id),
  level        TEXT DEFAULT 'info',                 -- debug|info|warning|error|success
  step         TEXT,
  message      TEXT,
  details_json JSONB,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------- ARTEFATOS DO JOB -------------------------
CREATE TABLE IF NOT EXISTS atlas_job_artifacts (
  id                    BIGSERIAL PRIMARY KEY,
  job_id                BIGINT REFERENCES atlas_jobs(id),
  artifact_type         TEXT,                        -- excel|csv|zip|report_md|report_pdf|prototype_html|prototype_js|log|json|config|validation_report
  file_name             TEXT,
  local_path            TEXT,
  storage_bucket        TEXT,
  storage_path          TEXT,
  public_url            TEXT,
  signed_url_expires_at  TIMESTAMPTZ,
  mime_type             TEXT,
  size_bytes            BIGINT,
  checksum_sha256       TEXT,
  upload_status         TEXT DEFAULT 'local_only',   -- local_only|uploaded|failed|skipped|missing
  upload_error          TEXT,
  uploaded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status   ON atlas_jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_type     ON atlas_jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created  ON atlas_jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_joblogs_job   ON atlas_job_logs (job_id);
CREATE INDEX IF NOT EXISTS idx_jobart_job    ON atlas_job_artifacts (job_id);

-- ============================= VIEWS =============================
-- ordem: dependentes antes da base (vw_jobs_em_execucao/falhos dependem de vw_jobs_recentes)
-- evita CASCADE (não portável p/ SQLite) e mantém idempotência no Postgres
DROP VIEW IF EXISTS vw_jobs_em_execucao;
DROP VIEW IF EXISTS vw_jobs_falhos;
DROP VIEW IF EXISTS vw_job_dashboard;
DROP VIEW IF EXISTS vw_jobs_recentes;

CREATE VIEW vw_jobs_recentes AS
SELECT id, job_type, status, requested_by_email, requested_by_role, mode, tag,
       progress_percent, current_step, duration_seconds, exit_code, error_message,
       started_at, finished_at, created_at
FROM atlas_jobs
ORDER BY created_at DESC, id DESC;

CREATE VIEW vw_jobs_em_execucao AS
SELECT * FROM vw_jobs_recentes WHERE status IN ('queued', 'running', 'retrying');

CREATE VIEW vw_jobs_falhos AS
SELECT * FROM vw_jobs_recentes WHERE status IN ('failed', 'timeout');

-- KPIs (portável Postgres/SQLite: CURRENT_DATE + CASE, sem FILTER/date_trunc)
CREATE VIEW vw_job_dashboard AS
SELECT
  SUM(CASE WHEN created_at >= CURRENT_DATE THEN 1 ELSE 0 END)                         AS jobs_hoje,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)                                 AS sucesso,
  SUM(CASE WHEN status IN ('failed','timeout') THEN 1 ELSE 0 END)                     AS falhas,
  SUM(CASE WHEN status IN ('queued','running','retrying') THEN 1 ELSE 0 END)          AS em_execucao,
  AVG(CASE WHEN status = 'success' THEN duration_seconds END)                         AS duracao_media,
  MAX(CASE WHEN job_type = 'run_production' AND status='success' THEN finished_at END) AS ultima_producao,
  MAX(CASE WHEN job_type = 'run_production_write_db' AND status='success' THEN finished_at END) AS ultima_producao_banco
FROM atlas_jobs;

-- ===================== VIEWS DE ARTEFATOS =====================
DROP VIEW IF EXISTS vw_latest_artifacts;
DROP VIEW IF EXISTS vw_artifacts_by_round;
DROP VIEW IF EXISTS vw_job_artifacts_download;

CREATE VIEW vw_job_artifacts_download AS
SELECT a.id, a.job_id, a.artifact_type, a.file_name, a.storage_bucket, a.storage_path,
       a.mime_type, a.size_bytes, a.upload_status, a.uploaded_at, a.local_path,
       j.tag, j.created_at AS data_rodada, j.job_type, j.requested_by_email
FROM atlas_job_artifacts a
JOIN atlas_jobs j ON j.id = a.job_id;

CREATE VIEW vw_artifacts_by_round AS
SELECT j.tag, j.id AS job_id, j.job_type, j.created_at AS data_rodada,
       COUNT(*) AS artefatos,
       SUM(CASE WHEN a.upload_status = 'uploaded' THEN 1 ELSE 0 END) AS enviados,
       SUM(CASE WHEN a.upload_status = 'local_only' THEN 1 ELSE 0 END) AS so_local,
       SUM(COALESCE(a.size_bytes, 0)) AS bytes_total
FROM atlas_job_artifacts a
JOIN atlas_jobs j ON j.id = a.job_id
GROUP BY j.tag, j.id, j.job_type, j.created_at;

CREATE VIEW vw_latest_artifacts AS
SELECT * FROM vw_job_artifacts_download
ORDER BY uploaded_at DESC, id DESC;
