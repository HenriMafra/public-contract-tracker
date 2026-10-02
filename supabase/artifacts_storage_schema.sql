-- =====================================================================
-- ATLAS B2G — Artefatos no Storage: upgrade de atlas_job_artifacts + índices + views
-- Idempotente (Postgres). Para deployments que já rodaram jobs_schema.sql antigo.
-- Em deployments novos, o jobs_schema.sql já cria estas colunas/views.
-- =====================================================================

ALTER TABLE atlas_job_artifacts ADD COLUMN IF NOT EXISTS mime_type       TEXT;
ALTER TABLE atlas_job_artifacts ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT;
ALTER TABLE atlas_job_artifacts ADD COLUMN IF NOT EXISTS upload_status   TEXT DEFAULT 'local_only';
ALTER TABLE atlas_job_artifacts ADD COLUMN IF NOT EXISTS upload_error    TEXT;
ALTER TABLE atlas_job_artifacts ADD COLUMN IF NOT EXISTS uploaded_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobart_status ON atlas_job_artifacts (upload_status);
CREATE INDEX IF NOT EXISTS idx_jobart_type   ON atlas_job_artifacts (artifact_type);

-- Views (recriadas; idênticas às do jobs_schema.sql)
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
