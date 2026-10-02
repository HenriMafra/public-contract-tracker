-- =====================================================================
-- ATLAS B2G Online — Storage: buckets + policies por perfil
-- Rode no SQL Editor do Supabase (após rls_policies.sql, que cria atlas_role()).
-- IDEMPOTENTE: re-executável sem erro.
-- =====================================================================

-- ---------- Buckets (privados) ----------
INSERT INTO storage.buckets (id, name, public) VALUES
 ('rodadas','rodadas',false), ('relatorios','relatorios',false),
 ('exports','exports',false), ('logs','logs',false), ('prototipos','prototipos',false)
ON CONFLICT (id) DO NOTHING;

-- ---------- Policies em storage.objects ----------
-- Escrita (upload): apenas Admin/Operador (a esteira usa service role e ignora RLS).
DROP POLICY IF EXISTS storage_write_intel ON storage.objects;
CREATE POLICY storage_write_intel ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (atlas_role() IN ('Administrador','Operador de Inteligência'));
DROP POLICY IF EXISTS storage_update_intel ON storage.objects;
CREATE POLICY storage_update_intel ON storage.objects FOR UPDATE TO authenticated
  USING (atlas_role() IN ('Administrador','Operador de Inteligência'));

-- Leitura por bucket × perfil:
-- relatorios e prototipos: Admin, Operador, Coordenador, Diretoria
DROP POLICY IF EXISTS storage_read_rel ON storage.objects;
CREATE POLICY storage_read_rel ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id IN ('relatorios','prototipos')
  AND atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial','Diretoria')
);
-- exports e rodadas (base completa): Admin, Operador, Coordenador
DROP POLICY IF EXISTS storage_read_exp ON storage.objects;
CREATE POLICY storage_read_exp ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id IN ('exports','rodadas')
  AND atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial')
);
-- logs: Admin, Operador
DROP POLICY IF EXISTS storage_read_logs ON storage.objects;
CREATE POLICY storage_read_logs ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'logs' AND atlas_role() IN ('Administrador','Operador de Inteligência')
);

-- Observação: Vendedor NÃO acessa a base completa (sem policy de leitura nos buckets).
-- O download no app passa por /api/download-artifact, que também valida o perfil e gera signed URL.
