-- ============================================================================
-- EDITAIS / LICITAÇÕES (PNCP /contratacoes) — fonte NOVA de negócio novo.
-- Oportunidades de licitação publicadas e com proposta ABERTA (DF/GO, TI).
-- Idempotente. Depende de rls_policies.sql (atlas_role()/atlas_is_admin()).
-- ============================================================================
CREATE TABLE IF NOT EXISTS editais (
  id                    BIGSERIAL PRIMARY KEY,
  id_pncp               TEXT UNIQUE,            -- numeroControlePNCP (chave natural)
  modalidade_cod        INTEGER,
  modalidade            TEXT,
  situacao              TEXT,
  proposta_aberta       BOOLEAN NOT NULL DEFAULT FALSE,
  objeto                TEXT,
  valor_estimado        NUMERIC,
  srp                   BOOLEAN NOT NULL DEFAULT FALSE,  -- sistema de registro de preços
  data_publicacao       DATE,
  abertura_proposta     TIMESTAMPTZ,
  encerramento_proposta TIMESTAMPTZ,
  orgao_cnpj            TEXT,
  orgao_nome            TEXT,
  uf                    TEXT,
  municipio             TEXT,
  unidade               TEXT,
  link                  TEXT,
  ano                   INTEGER,
  categoria             TEXT,
  subcategoria          TEXT,
  confianca             TEXT,
  palavras              JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editais_encerra_idx ON editais (encerramento_proposta);
CREATE INDEX IF NOT EXISTS editais_aberta_idx  ON editais (proposta_aberta);
CREATE INDEX IF NOT EXISTS editais_uf_idx       ON editais (uf);
CREATE INDEX IF NOT EXISTS editais_categoria_idx ON editais (categoria);

ALTER TABLE editais ENABLE ROW LEVEL SECURITY;

-- Editais (licitações) ESCOPADOS por LOCALIZAÇÃO, igual aos contratos: admin vê tudo;
-- sem UF definida = vê tudo; senão só editais da(s) UF(s) do usuário (perfil_ufs).
-- (Antes era "atlas_role() IS NOT NULL" → vazava editais de todas as UFs para qualquer AM.)
DROP POLICY IF EXISTS editais_sel ON editais;
CREATE POLICY editais_sel ON editais FOR SELECT USING (
  atlas_role() IS NOT NULL AND (
    atlas_is_admin()
    OR NOT EXISTS (SELECT 1 FROM perfil_ufs pu WHERE pu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM perfil_ufs pu WHERE pu.user_id = auth.uid() AND pu.uf = editais.uf)
  )
);

DROP POLICY IF EXISTS editais_adm ON editais;
CREATE POLICY editais_adm ON editais FOR ALL USING (atlas_is_admin()) WITH CHECK (atlas_is_admin());
