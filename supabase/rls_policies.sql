-- =====================================================================
-- ATLAS B2G Online — Row Level Security (RLS) + perfis
-- Rode APÓS schema_atlas_b2g.sql e seed_atlas_b2g.sql, no SQL Editor do Supabase.
-- IDEMPOTENTE: pode ser re-executado sem erro (DROP POLICY IF EXISTS antes de criar).
-- =====================================================================

-- ---------- Perfis (mapeia auth.users -> papel interno) ----------
CREATE TABLE IF NOT EXISTS perfis (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'Vendedor',
  nome          TEXT,
  uf            TEXT,
  vendedor_nome TEXT,                 -- casa com oportunidades.responsavel_atribuido (restrição do vendedor)
  ativo         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Funções auxiliares (SECURITY DEFINER para ler perfis sem recursão de RLS)
CREATE OR REPLACE FUNCTION atlas_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role FROM perfis WHERE user_id = auth.uid() AND ativo), 'anon');
$$;
CREATE OR REPLACE FUNCTION atlas_is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role = 'Administrador' FROM perfis WHERE user_id = auth.uid() AND ativo), FALSE);
$$;
CREATE OR REPLACE FUNCTION atlas_vendedor_nome() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT vendedor_nome FROM perfis WHERE user_id = auth.uid());
$$;

-- ---------- Views respeitam a RLS do usuário (PG15+) ----------
ALTER VIEW vw_oportunidades_ativas          SET (security_invoker = on);
ALTER VIEW vw_lista_ataque_atual            SET (security_invoker = on);
ALTER VIEW vw_top_10_semana                 SET (security_invoker = on);
ALTER VIEW vw_oportunidades_por_responsavel SET (security_invoker = on);
ALTER VIEW vw_concorrentes                  SET (security_invoker = on);
ALTER VIEW vw_qualidade_base                SET (security_invoker = on);
ALTER VIEW vw_dashboard_executivo           SET (security_invoker = on);
ALTER VIEW vw_historico_rodadas             SET (security_invoker = on);

-- ---------- Habilita RLS ----------
ALTER TABLE perfis                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidade_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgaos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rodadas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisoes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_sistema     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- ---------- PERFIS ----------
DROP POLICY IF EXISTS perfis_sel ON perfis;
CREATE POLICY perfis_sel ON perfis FOR SELECT USING (user_id = auth.uid() OR atlas_is_admin());
DROP POLICY IF EXISTS perfis_adm ON perfis;
CREATE POLICY perfis_adm ON perfis FOR ALL USING (atlas_is_admin()) WITH CHECK (atlas_is_admin());

-- ---------- Tabelas-base (contratos públicos): qualquer autenticado lê ----------
DROP POLICY IF EXISTS orgaos_sel ON orgaos;
CREATE POLICY orgaos_sel ON orgaos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS contratos_sel ON contratos;
CREATE POLICY contratos_sel ON contratos FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS fornecedores_sel ON fornecedores;
CREATE POLICY fornecedores_sel ON fornecedores FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS rodadas_sel ON rodadas;
CREATE POLICY rodadas_sel ON rodadas FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS hist_sel ON oportunidade_historico;
CREATE POLICY hist_sel ON oportunidade_historico FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS parametros_sel ON parametros_sistema;
CREATE POLICY parametros_sel ON parametros_sistema FOR SELECT USING (auth.role() = 'authenticated');

-- ---------- OPORTUNIDADES ----------
-- Leitura: Admin/Operador/Coordenador/Diretoria veem tudo; Vendedor vê só as suas.
DROP POLICY IF EXISTS oportunidades_sel ON oportunidades;
CREATE POLICY oportunidades_sel ON oportunidades FOR SELECT USING (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial','Diretoria')
  OR (atlas_role() = 'Vendedor' AND responsavel_atribuido = atlas_vendedor_nome())
);
-- Atualização: Admin/Coordenador/Operador; Vendedor só as suas.
DROP POLICY IF EXISTS oportunidades_upd ON oportunidades;
CREATE POLICY oportunidades_upd ON oportunidades FOR UPDATE USING (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial')
  OR (atlas_role() = 'Vendedor' AND responsavel_atribuido = atlas_vendedor_nome())
);

-- ---------- CONTATOS ----------
DROP POLICY IF EXISTS contatos_sel ON contatos;
CREATE POLICY contatos_sel ON contatos FOR SELECT USING (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial','Diretoria')
  OR EXISTS (SELECT 1 FROM oportunidades o WHERE o.id = contatos.oportunidade_id AND o.responsavel_atribuido = atlas_vendedor_nome())
);
DROP POLICY IF EXISTS contatos_ins ON contatos;
CREATE POLICY contatos_ins ON contatos FOR INSERT WITH CHECK (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial','Vendedor')
);

-- ---------- TAREFAS ----------
DROP POLICY IF EXISTS tarefas_all ON tarefas;
CREATE POLICY tarefas_all ON tarefas FOR ALL USING (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial','Vendedor')
) WITH CHECK (true);

-- ---------- REVISÕES ----------
DROP POLICY IF EXISTS revisoes_sel ON revisoes;
CREATE POLICY revisoes_sel ON revisoes FOR SELECT USING (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial')
);
DROP POLICY IF EXISTS revisoes_upd ON revisoes;
CREATE POLICY revisoes_upd ON revisoes FOR UPDATE USING (
  atlas_role() IN ('Administrador','Operador de Inteligência')
);

-- ---------- RESPONSÁVEIS ----------
DROP POLICY IF EXISTS responsaveis_sel ON responsaveis;
CREATE POLICY responsaveis_sel ON responsaveis FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS responsaveis_adm ON responsaveis;
CREATE POLICY responsaveis_adm ON responsaveis FOR ALL USING (atlas_is_admin()) WITH CHECK (atlas_is_admin());

-- ---------- PARÂMETROS (escrita só Admin) ----------
DROP POLICY IF EXISTS parametros_adm ON parametros_sistema;
CREATE POLICY parametros_adm ON parametros_sistema FOR ALL USING (atlas_is_admin()) WITH CHECK (atlas_is_admin());

-- ---------- AUDIT LOGS (lê Admin; escrita via service role, que ignora RLS) ----------
DROP POLICY IF EXISTS audit_sel ON audit_logs;
CREATE POLICY audit_sel ON audit_logs FOR SELECT USING (atlas_is_admin());

-- Observações:
-- * A esteira/Job Runner grava usando a SERVICE ROLE (ignora RLS) — apenas no servidor.
-- * O frontend usa a ANON key + sessão do usuário → as policies acima se aplicam.
-- * Ajuste 'vendedor_nome' em perfis para casar com oportunidades.responsavel_atribuido.
