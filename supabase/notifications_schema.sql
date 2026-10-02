-- =====================================================================
-- ATLAS B2G — Centro de Notificações Persistentes — Schema
-- Postgres/Supabase em produção; compatível com SQLite (tradução em atlas_db.py).
-- Rode após schema_atlas_b2g.sql. Idempotente.
-- =====================================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id                    BIGSERIAL PRIMARY KEY,
  tipo                  TEXT NOT NULL,                 -- job_success|job_failed|opportunity_critical|...
  titulo                TEXT NOT NULL,
  mensagem              TEXT,
  nivel                 TEXT DEFAULT 'info',           -- info|success|warning|error|critical
  perfil_destino        TEXT,                          -- papel-alvo (broadcast por perfil) ou NULL
  usuario_destino_id    UUID,                          -- usuário específico (auth.users.id)
  usuario_destino_email TEXT,
  responsavel_destino   TEXT,                          -- casa com oportunidades.responsavel_atribuido (vendedor)
  escopo                TEXT DEFAULT 'role',           -- user|role|global
  entidade_tipo         TEXT,
  entidade_id           TEXT,
  job_id                BIGINT,
  oportunidade_id       BIGINT,
  rodada_id             BIGINT,
  artifact_id           BIGINT,
  link_url              TEXT,
  metadata_json         JSONB,
  lida                  BOOLEAN DEFAULT FALSE,
  lida_em               TIMESTAMPTZ,
  criada_por            TEXT,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at            TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               UUID UNIQUE,
  email                 TEXT,
  role                  TEXT,
  notify_jobs           BOOLEAN DEFAULT TRUE,
  notify_opportunities  BOOLEAN DEFAULT TRUE,
  notify_assignments    BOOLEAN DEFAULT TRUE,
  notify_reviews        BOOLEAN DEFAULT TRUE,
  notify_artifacts      BOOLEAN DEFAULT TRUE,
  notify_errors         BOOLEAN DEFAULT TRUE,
  notify_weekly_summary BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_perfil   ON notificacoes (perfil_destino);
CREATE INDEX IF NOT EXISTS idx_notif_email    ON notificacoes (usuario_destino_email);
CREATE INDEX IF NOT EXISTS idx_notif_resp     ON notificacoes (responsavel_destino);
CREATE INDEX IF NOT EXISTS idx_notif_lida     ON notificacoes (lida);
CREATE INDEX IF NOT EXISTS idx_notif_created  ON notificacoes (created_at);
CREATE INDEX IF NOT EXISTS idx_notif_tipo     ON notificacoes (tipo);
CREATE INDEX IF NOT EXISTS idx_notif_nivel    ON notificacoes (nivel);

-- ============================= VIEWS =============================
-- Projeções simples: a RLS (security_invoker) recorta por usuário.
DROP VIEW IF EXISTS vw_notification_dashboard;
DROP VIEW IF EXISTS vw_notificacoes_admin;
DROP VIEW IF EXISTS vw_notificacoes_nao_lidas;
DROP VIEW IF EXISTS vw_notificacoes_usuario;

CREATE VIEW vw_notificacoes_usuario AS
SELECT id, tipo, titulo, mensagem, nivel, perfil_destino, usuario_destino_email, responsavel_destino,
       escopo, entidade_tipo, entidade_id, job_id, oportunidade_id, rodada_id, artifact_id,
       link_url, lida, lida_em, created_at, expires_at
FROM notificacoes
ORDER BY created_at DESC, id DESC;

CREATE VIEW vw_notificacoes_nao_lidas AS
SELECT * FROM vw_notificacoes_usuario WHERE lida = FALSE;

CREATE VIEW vw_notificacoes_admin AS
SELECT id, tipo, titulo, nivel, perfil_destino, usuario_destino_email, responsavel_destino,
       escopo, lida, criada_por, created_at
FROM notificacoes
ORDER BY created_at DESC, id DESC;

CREATE VIEW vw_notification_dashboard AS
SELECT
  SUM(CASE WHEN created_at >= CURRENT_DATE THEN 1 ELSE 0 END) AS total_hoje,
  SUM(CASE WHEN lida = FALSE THEN 1 ELSE 0 END)              AS nao_lidas,
  SUM(CASE WHEN nivel = 'critical' THEN 1 ELSE 0 END)         AS criticas,
  SUM(CASE WHEN nivel = 'error' THEN 1 ELSE 0 END)            AS erros,
  COUNT(*)                                                    AS total
FROM notificacoes;
