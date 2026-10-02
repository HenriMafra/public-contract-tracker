-- =====================================================================
-- ATLAS B2G — RLS/segurança das views de artefatos. Rode após jobs_rls_policies.sql.
-- A tabela atlas_job_artifacts já tem RLS (jobart_sel em jobs_rls_policies.sql).
-- Aqui só garantimos que as VIEWS respeitam a RLS do usuário (PG15+).
-- O download real é mediado pela API (/api/jobs/artifacts/download), que valida o perfil
-- e gera signed URL de curta duração — buckets permanecem PRIVADOS.
-- =====================================================================

ALTER VIEW vw_job_artifacts_download SET (security_invoker = on);
ALTER VIEW vw_artifacts_by_round     SET (security_invoker = on);
ALTER VIEW vw_latest_artifacts       SET (security_invoker = on);
