-- ============================================================================
-- COMISSIONAMENTO / CONDICIONAMENTO (Enterprise IT Group) — migrado do app antigo
-- (projeto Supabase uqzxdqqtoaoxaydmjwmd, descontinuado) para o Supabase do
-- MAPPER. Acesso restrito a Diretoria + Administrador (RLS). Idempotente.
-- Depende de rls_policies.sql (atlas_role()/atlas_is_admin()).
-- ============================================================================

-- ----------------------------- TABELAS --------------------------------------
CREATE TABLE IF NOT EXISTS comissionamentos (
  id                  BIGSERIAL PRIMARY KEY,
  perfil              TEXT,                       -- 'Pre-Vendas' | 'Account Manager'
  nome_preenchedor    TEXT,
  id_bitrix           TEXT,
  comissionados       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{nome,percentual,fases[]}]
  margem_projeto      TEXT,
  tipo_projeto        TEXT,
  fases_comissionadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por          UUID DEFAULT auth.uid()     -- quem registrou (rastreio)
);

CREATE TABLE IF NOT EXISTS condicionamentos (
  id                    BIGSERIAL PRIMARY KEY,
  perfil                TEXT,
  nome_preenchedor      TEXT,
  sobrenome_preenchedor TEXT,
  id_bitrix             TEXT,
  nome_comissionado     TEXT,
  percentual            NUMERIC,
  fases_comissionadas   JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por            UUID DEFAULT auth.uid()
);
-- Para bancos já criados antes desta coluna existir:
ALTER TABLE condicionamentos ADD COLUMN IF NOT EXISTS percentual NUMERIC;

CREATE INDEX IF NOT EXISTS comiss_criado_em_idx   ON comissionamentos (criado_em DESC);
CREATE INDEX IF NOT EXISTS condic_criado_em_idx   ON condicionamentos (criado_em DESC);

-- ----------------------------- RLS ------------------------------------------
ALTER TABLE comissionamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE condicionamentos ENABLE ROW LEVEL SECURITY;

-- Diretoria + Admin podem ver e registrar. (Demais perfis: sem acesso.)
DROP POLICY IF EXISTS comiss_sel ON comissionamentos;
CREATE POLICY comiss_sel ON comissionamentos FOR SELECT
  USING (atlas_is_admin() OR atlas_role() = 'Diretoria');

DROP POLICY IF EXISTS comiss_ins ON comissionamentos;
CREATE POLICY comiss_ins ON comissionamentos FOR INSERT
  WITH CHECK (atlas_is_admin() OR atlas_role() = 'Diretoria');

DROP POLICY IF EXISTS comiss_del ON comissionamentos;
CREATE POLICY comiss_del ON comissionamentos FOR DELETE
  USING (atlas_is_admin());

DROP POLICY IF EXISTS condic_sel ON condicionamentos;
CREATE POLICY condic_sel ON condicionamentos FOR SELECT
  USING (atlas_is_admin() OR atlas_role() = 'Diretoria');

DROP POLICY IF EXISTS condic_ins ON condicionamentos;
CREATE POLICY condic_ins ON condicionamentos FOR INSERT
  WITH CHECK (atlas_is_admin() OR atlas_role() = 'Diretoria');

DROP POLICY IF EXISTS condic_del ON condicionamentos;
CREATE POLICY condic_del ON condicionamentos FOR DELETE
  USING (atlas_is_admin());
