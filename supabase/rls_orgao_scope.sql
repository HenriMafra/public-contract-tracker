-- =====================================================================
-- ATLAS B2G — Escopo por ÓRGÃO + papéis AM / SE / Intern
-- Roda APÓS rls_policies.sql. IDEMPOTENTE (re-executável).
-- Regra: Administrador / Diretoria veem TUDO; Account Manager / Sales Engineer /
-- Intern veem SOMENTE os órgãos atribuídos em perfil_orgaos. (Papéis legados
-- Coordenador/Operador continuam vendo tudo; Vendedor legado fica escopado.)
-- =====================================================================

-- 1) Atribuição usuário -> órgãos
CREATE TABLE IF NOT EXISTS perfil_orgaos (
  user_id  UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  orgao_id BIGINT NOT NULL REFERENCES orgaos(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, orgao_id)
);
CREATE INDEX IF NOT EXISTS idx_perfil_orgaos_user ON perfil_orgaos (user_id);
ALTER TABLE perfil_orgaos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS perfil_orgaos_sel ON perfil_orgaos;
CREATE POLICY perfil_orgaos_sel ON perfil_orgaos FOR SELECT USING (user_id = auth.uid() OR atlas_is_admin());
DROP POLICY IF EXISTS perfil_orgaos_adm ON perfil_orgaos;
CREATE POLICY perfil_orgaos_adm ON perfil_orgaos FOR ALL USING (atlas_is_admin()) WITH CHECK (atlas_is_admin());

-- 2) Função de escopo: este usuário pode ver este órgão?
CREATE OR REPLACE FUNCTION atlas_orgao_liberado(o_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN atlas_role() IN ('Administrador','Diretoria','Coordenador Comercial','Operador de Inteligência') THEN TRUE
    WHEN o_id IS NULL THEN FALSE
    ELSE EXISTS (SELECT 1 FROM perfil_orgaos po WHERE po.user_id = auth.uid() AND po.orgao_id = o_id)
  END;
$$;

-- 3) Políticas escopadas por órgão (substituem as anteriores)
DROP POLICY IF EXISTS orgaos_sel ON orgaos;
CREATE POLICY orgaos_sel ON orgaos FOR SELECT USING (atlas_orgao_liberado(id));

DROP POLICY IF EXISTS contratos_sel ON contratos;
CREATE POLICY contratos_sel ON contratos FOR SELECT USING (atlas_orgao_liberado(orgao_id));

DROP POLICY IF EXISTS oportunidades_sel ON oportunidades;
CREATE POLICY oportunidades_sel ON oportunidades FOR SELECT USING (atlas_orgao_liberado(orgao_id));

-- Atualização (assumir/decidir): Admin e legados gestores; AM/SE só nos seus órgãos. Intern/Diretoria não alteram.
DROP POLICY IF EXISTS oportunidades_upd ON oportunidades;
CREATE POLICY oportunidades_upd ON oportunidades FOR UPDATE USING (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial')
  OR (atlas_role() IN ('Account Manager','Sales Engineer') AND atlas_orgao_liberado(orgao_id))
);

-- Histórico e contatos: escopados pelo órgão da oportunidade
DROP POLICY IF EXISTS hist_sel ON oportunidade_historico;
CREATE POLICY hist_sel ON oportunidade_historico FOR SELECT USING (
  EXISTS (SELECT 1 FROM oportunidades o WHERE o.id = oportunidade_historico.oportunidade_id AND atlas_orgao_liberado(o.orgao_id))
);

DROP POLICY IF EXISTS contatos_sel ON contatos;
CREATE POLICY contatos_sel ON contatos FOR SELECT USING (
  EXISTS (SELECT 1 FROM oportunidades o WHERE o.id = contatos.oportunidade_id AND atlas_orgao_liberado(o.orgao_id))
);
DROP POLICY IF EXISTS contatos_ins ON contatos;
CREATE POLICY contatos_ins ON contatos FOR INSERT WITH CHECK (
  atlas_role() IN ('Administrador','Operador de Inteligência','Coordenador Comercial','Account Manager','Sales Engineer')
);
