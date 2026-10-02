-- =====================================================================
-- ATLAS B2G — RLS da fila de jobs. Rode APÓS jobs_schema.sql e rls_policies.sql
-- (que cria atlas_role()/atlas_is_admin()). Idempotente.
-- Escrita (insert/update/cancel) é feita pela SERVICE ROLE no servidor (ignora RLS).
-- Estas policies governam a LEITURA via anon/sessão do usuário no frontend.
-- =====================================================================

ALTER VIEW vw_jobs_recentes    SET (security_invoker = on);
ALTER VIEW vw_jobs_em_execucao SET (security_invoker = on);
ALTER VIEW vw_jobs_falhos      SET (security_invoker = on);
ALTER VIEW vw_job_dashboard    SET (security_invoker = on);

ALTER TABLE atlas_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE atlas_job_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE atlas_job_artifacts ENABLE ROW LEVEL SECURITY;

-- ---------- JOBS ----------
-- Admin/Operador: veem tudo. Coordenador/Diretoria: só jobs finalizados. Vendedor: nada.
DROP POLICY IF EXISTS jobs_sel ON atlas_jobs;
CREATE POLICY jobs_sel ON atlas_jobs FOR SELECT USING (
  atlas_role() IN ('Administrador','Operador de Inteligência')
  OR (atlas_role() IN ('Coordenador Comercial','Diretoria')
      AND status IN ('success','failed','cancelled','timeout'))
);
-- Escrita só Admin via sessão (a esteira/serviço usa service role e ignora RLS).
DROP POLICY IF EXISTS jobs_ins ON atlas_jobs;
CREATE POLICY jobs_ins ON atlas_jobs FOR INSERT WITH CHECK (atlas_is_admin());
DROP POLICY IF EXISTS jobs_upd ON atlas_jobs;
CREATE POLICY jobs_upd ON atlas_jobs FOR UPDATE USING (
  atlas_role() IN ('Administrador','Operador de Inteligência')
);

-- ---------- LOGS ----------
DROP POLICY IF EXISTS joblogs_sel ON atlas_job_logs;
CREATE POLICY joblogs_sel ON atlas_job_logs FOR SELECT USING (
  atlas_role() IN ('Administrador','Operador de Inteligência')
);

-- ---------- ARTEFATOS ----------
-- Admin/Operador: todos. Coordenador/Diretoria: dos jobs finalizados (pacotes/relatórios).
DROP POLICY IF EXISTS jobart_sel ON atlas_job_artifacts;
CREATE POLICY jobart_sel ON atlas_job_artifacts FOR SELECT USING (
  atlas_role() IN ('Administrador','Operador de Inteligência')
  OR (atlas_role() IN ('Coordenador Comercial','Diretoria')
      AND EXISTS (SELECT 1 FROM atlas_jobs j WHERE j.id = atlas_job_artifacts.job_id
                  AND j.status IN ('success','failed','cancelled','timeout')))
);
