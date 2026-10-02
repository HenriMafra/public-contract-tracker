-- =====================================================================
-- ATLAS B2G — Supabase Realtime: adiciona tabelas à publication.
-- Rode no SQL Editor do Supabase (idempotente). Postgres-only.
-- A RLS continua valendo no Realtime: cada cliente só recebe eventos das linhas
-- que poderia LER via SELECT. Por isso NÃO há vazamento (ver realtime_security_notes.md).
-- Pré-requisito: as tabelas existem (schema/jobs) e têm PRIMARY KEY (já têm).
-- =====================================================================

-- 1) Garante a publication e adiciona as tabelas (idempotente)
DO $$
DECLARE t text;
DECLARE tabs text[] := ARRAY['atlas_jobs','atlas_job_logs','atlas_job_artifacts','rodadas',
  'oportunidades','oportunidade_historico','tarefas','contatos','revisoes','audit_logs','notificacoes'];
BEGIN
  -- cria a publication se não existir (no Supabase ela já existe como supabase_realtime)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
  END IF;
  FOREACH t IN ARRAY tabs LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;   -- já está na publication
      WHEN undefined_table THEN NULL;    -- tabela ainda não existe (ignora)
    END;
  END LOOP;
END $$;

-- 2) REPLICA IDENTITY FULL nas tabelas cujo UPDATE/DELETE precisa enviar a linha completa
--    (para o frontend reagir a mudanças de status/score sem refetch). RLS continua aplicada.
DO $$
DECLARE t text;
DECLARE tabs text[] := ARRAY['atlas_jobs','atlas_job_artifacts','oportunidades','revisoes'];
BEGIN
  FOREACH t IN ARRAY tabs LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXCEPTION WHEN undefined_table THEN NULL; END;
  END LOOP;
END $$;

-- Conferir o que está publicado:
--   SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY 1;
