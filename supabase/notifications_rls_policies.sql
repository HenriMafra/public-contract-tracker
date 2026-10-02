-- =====================================================================
-- ATLAS B2G — RLS do Centro de Notificações. Rode após notifications_schema.sql
-- e rls_policies.sql (que cria atlas_role()/atlas_is_admin()/atlas_vendedor_nome()).
-- Idempotente. Escrita via service role (servidor/worker) ignora RLS.
-- =====================================================================

-- e-mail do usuário logado (para casar usuario_destino_email)
CREATE OR REPLACE FUNCTION atlas_email() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, public AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

ALTER VIEW vw_notificacoes_usuario   SET (security_invoker = on);
ALTER VIEW vw_notificacoes_nao_lidas SET (security_invoker = on);
ALTER VIEW vw_notificacoes_admin     SET (security_invoker = on);
ALTER VIEW vw_notification_dashboard SET (security_invoker = on);

ALTER TABLE notificacoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Preditor de visibilidade: destinada a mim (id/email), ao meu perfil, a mim como vendedor, ou sou Admin.
DROP POLICY IF EXISTS notif_sel ON notificacoes;
CREATE POLICY notif_sel ON notificacoes FOR SELECT USING (
  atlas_is_admin()
  OR usuario_destino_id = auth.uid()
  OR (usuario_destino_email IS NOT NULL AND usuario_destino_email = atlas_email())
  OR (perfil_destino IS NOT NULL AND perfil_destino = atlas_role())
  OR (responsavel_destino IS NOT NULL AND responsavel_destino = atlas_vendedor_nome())
);

-- UPDATE (marcar como lida) somente nas próprias notificações visíveis.
DROP POLICY IF EXISTS notif_upd ON notificacoes;
CREATE POLICY notif_upd ON notificacoes FOR UPDATE USING (
  atlas_is_admin()
  OR usuario_destino_id = auth.uid()
  OR (usuario_destino_email IS NOT NULL AND usuario_destino_email = atlas_email())
  OR (perfil_destino IS NOT NULL AND perfil_destino = atlas_role())
  OR (responsavel_destino IS NOT NULL AND responsavel_destino = atlas_vendedor_nome())
);

-- INSERT manual só Admin (worker/sistema usam service role e ignoram RLS).
DROP POLICY IF EXISTS notif_ins ON notificacoes;
CREATE POLICY notif_ins ON notificacoes FOR INSERT WITH CHECK (atlas_is_admin());

-- DELETE/limpeza só Admin.
DROP POLICY IF EXISTS notif_del ON notificacoes;
CREATE POLICY notif_del ON notificacoes FOR DELETE USING (atlas_is_admin());

-- Preferências: cada um gerencia as suas (Admin vê todas).
DROP POLICY IF EXISTS prefs_sel ON notification_preferences;
CREATE POLICY prefs_sel ON notification_preferences FOR SELECT USING (user_id = auth.uid() OR atlas_is_admin());
DROP POLICY IF EXISTS prefs_all ON notification_preferences;
CREATE POLICY prefs_all ON notification_preferences FOR ALL USING (user_id = auth.uid() OR atlas_is_admin()) WITH CHECK (user_id = auth.uid() OR atlas_is_admin());
