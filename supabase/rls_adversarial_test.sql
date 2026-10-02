-- =====================================================================
-- TESTE ADVERSARIAL DE RLS — prova que um usuário escopado NÃO vê dados
-- fora da(s) sua(s) UF(s) (vazamento cross-tenant). Roda como o papel
-- `authenticated` (que NÃO bypassa RLS, ao contrário de postgres/service_role).
--
-- Como usar: troque <UID> pelo user_id de um perfil escopado (AM/SE/Intern)
-- e <UF> pela UF dele (perfil_ufs). Esperado: bloco "fora" = 0.
-- =====================================================================
begin;
  -- finge ser o usuário-alvo
  select set_config('request.jwt.claims',
    json_build_object('sub', '<UID>', 'role', 'authenticated')::text, true);
  set local role authenticated;   -- revertido automaticamente no commit/rollback

  -- 1) Lista de Ataque: nada fora da UF do usuário
  select 'lista_dentro' as escopo, count(*)::int as n from vw_lista_ataque_atual where uf = '<UF>'
  union all
  select 'lista_fora',          count(*)::int      from vw_lista_ataque_atual where uf is distinct from '<UF>';

  -- 2) Editais: idem (a tabela tem RLS própria)
  select 'editais_dentro' as escopo, count(*)::int as n from editais where uf = '<UF>'
  union all
  select 'editais_fora',           count(*)::int       from editais where uf is distinct from '<UF>';
rollback;
-- Se qualquer "*_fora" > 0 => VAZAMENTO de RLS. Investigar atlas_orgao_liberado / policies.
