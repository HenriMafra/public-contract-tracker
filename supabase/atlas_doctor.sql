-- atlas_doctor(): AUTO-RESOLVEDOR — bateria GRANDE de verificações+correções no banco
-- (roda na nuvem, sem PC). Retorna [{item, status: ok|corrigido|alerta|erro, detalhe}].
-- Cada passo é isolado (BEGIN/EXCEPTION): uma falha não derruba as outras.
create or replace function public.atlas_doctor()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  r jsonb := '[]'::jsonb;
  n int; n2 int; v text; quebradas int := 0;
begin
  -- 1) Conexão
  r := r || jsonb_build_array(jsonb_build_object('item','Conexão com o banco','status','ok','detalhe','conectado e respondendo'));

  -- 2) Tabelas essenciais
  begin
    select count(*) into n from information_schema.tables where table_schema='public'
      and table_name in ('oportunidades','contratos','orgaos','fornecedores','editais','rodadas','perfis','atlas_jobs','contatos');
    r := r || jsonb_build_array(jsonb_build_object('item','Tabelas essenciais','status',case when n>=9 then 'ok' else 'alerta' end,'detalhe',n||'/9 presentes'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Tabelas essenciais','status','erro','detalhe',sqlerrm)); end;

  -- 3) Colunas/tabelas que o app usa (cria se faltar)
  begin
    alter table contratos add column if not exists fabricante text;
    alter table oportunidades add column if not exists fabricante text;
    alter table orgaos add column if not exists sigla text;
    alter table contatos add column if not exists telefone text;
    alter table contatos add column if not exists email text;
    create table if not exists perfil_ufs (user_id uuid not null, uf text not null, primary key (user_id, uf));
    r := r || jsonb_build_array(jsonb_build_object('item','Colunas/tabelas do app','status','ok','detalhe','fabricante, sigla, telefone, email, perfil_ufs garantidos'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Colunas/tabelas do app','status','erro','detalhe',sqlerrm)); end;

  -- 4) Jobs travados (fila/rodando ha +2h sem worker) -> liberar
  begin
    update atlas_jobs set status='failed', finished_at=now(),
      error_message=coalesce(error_message,'')||' [auto-resolver: liberado por ficar parado sem worker]'
      where status in ('queued','running') and created_at < now() - interval '2 hours';
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Jobs travados na fila','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' job(s) antigos liberados'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Jobs travados na fila','status','erro','detalhe',sqlerrm)); end;

  -- 5) View principal (recria a cadeia se quebrar)
  begin
    -- seleciona fabricante de propósito: se a view existir mas estiver desatualizada (sem essa coluna),
    -- isto falha e cai no recriar — evita o bug de a Lista/Relatório voltarem vazios.
    perform fabricante from vw_lista_ataque_atual limit 1;
    r := r || jsonb_build_array(jsonb_build_object('item','View Lista de Ataque','status','ok','detalhe','consultavel'));
  exception when others then
    begin
      create or replace view vw_oportunidades_ativas as
        select o.id,o.id_oportunidade,o.rodada_id,o.tipo_oportunidade,o.janela_comercial,o.urgencia_comercial,
          o.score_comercial,o.prioridade,o.status_comercial,o.status_validacao,o.responsavel_sugerido,
          o.responsavel_atribuido,o.carteira_sugerida,o.proxima_acao_recomendada,o.argumento_comercial_sugerido,
          o.motivo_prioridade,o.necessita_revisao,o.status_na_rodada,org.nome_orgao,org.nome_padronizado as orgao_padronizado,
          org.uf,org.municipio,org.esfera,org.poder,f.nome_fornecedor,f.possivel_concorrente,f.concorrente_conhecido,
          f.grau_ameaca,c.categoria_principal,c.subcategoria,c.valor_total,c.dias_ate_vencimento,c.status_contrato,
          c.fim_vigencia,c.link_fonte,c.id_pncp, coalesce(o.fabricante, c.fabricante) as fabricante
        from oportunidades o join orgaos org on org.id=o.orgao_id
          left join fornecedores f on f.id=o.fornecedor_id left join contratos c on c.id=o.contrato_id
        where o.status_na_rodada <> 'Removida';
      create or replace view vw_lista_ataque_atual as
        select * from vw_oportunidades_ativas
        where rodada_id = (select id from rodadas order by data_rodada desc, id desc limit 1);
      -- CRÍTICO: reaplicar security_invoker nas DUAS views da cadeia. Sem isto, ao recriar
      -- elas rodariam com privilégios do dono (postgres) e a RLS por escopo (atlas_orgao_liberado)
      -- deixaria de filtrar — um AM passaria a ver TODOS os órgãos/UFs. (espelha rls_policies.sql)
      alter view vw_oportunidades_ativas set (security_invoker = on);
      alter view vw_lista_ataque_atual  set (security_invoker = on);
      r := r || jsonb_build_array(jsonb_build_object('item','View Lista de Ataque','status','corrigido','detalhe','recriada (estava quebrada) + security_invoker reaplicado nas 2 views'));
    exception when others then r := r || jsonb_build_array(jsonb_build_object('item','View Lista de Ataque','status','erro','detalhe',sqlerrm)); end;
  end;

  -- 6) Funcoes de seguranca (RLS)
  begin
    select count(*) into n from pg_proc where proname in ('atlas_role','atlas_is_admin','atlas_orgao_liberado');
    r := r || jsonb_build_array(jsonb_build_object('item','Funcoes de seguranca (RLS)','status',case when n>=3 then 'ok' else 'alerta' end,'detalhe',n||'/3 presentes'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Funcoes de seguranca (RLS)','status','erro','detalhe',sqlerrm)); end;

  -- 7) Admin ativo
  begin
    select count(*) into n from perfis where role='Administrador' and ativo;
    r := r || jsonb_build_array(jsonb_build_object('item','Administrador ativo','status',case when n>0 then 'ok' else 'alerta' end,'detalhe',n||' admin(s) ativo(s)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Administrador ativo','status','erro','detalhe',sqlerrm)); end;

  -- 8) Ultima rodada nao-vazia
  begin
    select total_oportunidades into n from rodadas order by data_rodada desc, id desc limit 1;
    r := r || jsonb_build_array(jsonb_build_object('item','Ultima rodada','status',case when coalesce(n,0)>0 then 'ok' else 'alerta' end,'detalhe',coalesce(n,0)||' oportunidades'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Ultima rodada','status','erro','detalhe',sqlerrm)); end;

  -- 9) Oportunidades visiveis
  begin
    select count(*) into n from vw_lista_ataque_atual;
    r := r || jsonb_build_array(jsonb_build_object('item','Oportunidades visiveis','status',case when n>0 then 'ok' else 'alerta' end,'detalhe',n||' na Lista de Ataque'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Oportunidades visiveis','status','erro','detalhe',sqlerrm)); end;

  -- 10) Editais
  begin
    select count(*) into n from editais; select count(*) into n2 from editais where proposta_aberta;
    r := r || jsonb_build_array(jsonb_build_object('item','Editais/licitacoes','status',case when n>0 then 'ok' else 'alerta' end,'detalhe',n||' editais ('||n2||' com proposta aberta)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Editais/licitacoes','status','erro','detalhe',sqlerrm)); end;

  -- 11) Orgaos sem sigla -> acronimo simples
  begin
    update orgaos set sigla = upper(coalesce((
        select string_agg(left(w,1),'') from regexp_split_to_table(coalesce(nome_padronizado,nome_orgao), E'\\s+') w
        where lower(w) not in ('de','da','do','das','dos','e','em','-') and length(w)>0 ), ''))
      where (sigla is null or sigla='') and coalesce(nome_padronizado,nome_orgao) is not null;
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Siglas de orgaos','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' sigla(s) preenchida(s)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Siglas de orgaos','status','erro','detalhe',sqlerrm)); end;

  -- 12) Localizacoes (perfil_ufs) orfas -> limpa
  begin
    delete from perfil_ufs pu where not exists (select 1 from perfis p where p.user_id=pu.user_id);
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Localizacoes orfas','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' removida(s)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Localizacoes orfas','status','erro','detalhe',sqlerrm)); end;

  -- 13) Oportunidades com orgao inexistente
  begin
    select count(*) into n from oportunidades o where o.orgao_id is not null and not exists (select 1 from orgaos g where g.id=o.orgao_id);
    r := r || jsonb_build_array(jsonb_build_object('item','Oportunidades orfas (sem orgao)','status',case when n=0 then 'ok' else 'alerta' end,'detalhe',n||' com orgao inexistente'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Oportunidades orfas (sem orgao)','status','erro','detalhe',sqlerrm)); end;

  -- 14) Editais "abertos" que JA venceram -> fecha o flag (dado obsoleto)
  begin
    update editais set proposta_aberta=false
      where proposta_aberta and encerramento_proposta is not null and encerramento_proposta < now();
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Editais abertos vencidos','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' marcados como encerrados'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Editais abertos vencidos','status','erro','detalhe',sqlerrm)); end;

  -- 15) dias_ate_vencimento faltando -> recalcula do fim_vigencia
  begin
    update contratos set dias_ate_vencimento = (fim_vigencia - current_date)
      where fim_vigencia is not null and dias_ate_vencimento is null;
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Dias p/ vencer (contratos)','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' recalculado(s)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Dias p/ vencer (contratos)','status','erro','detalhe',sqlerrm)); end;

  -- 16) status_validacao nulo -> 'Pendente'
  begin
    update oportunidades set status_validacao='Pendente' where status_validacao is null;
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Decisao em branco','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' marcada(s) como Pendente'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Decisao em branco','status','erro','detalhe',sqlerrm)); end;

  -- 17) Indices de performance que faltam
  begin
    create index if not exists ix_editais_aberta on editais(proposta_aberta);
    create index if not exists ix_editais_uf on editais(uf);
    create index if not exists ix_orgaos_uf on orgaos(uf);
    r := r || jsonb_build_array(jsonb_build_object('item','Indices de performance','status','ok','detalhe','indices de editais/orgaos garantidos'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Indices de performance','status','erro','detalhe',sqlerrm)); end;

  -- 18) Usuarios que logam mas nao tem perfil (ficariam sem ver nada)
  begin
    select count(*) into n from auth.users u where not exists (select 1 from perfis p where p.user_id=u.id);
    r := r || jsonb_build_array(jsonb_build_object('item','Usuarios sem perfil','status',case when n=0 then 'ok' else 'alerta' end,'detalhe',case when n=0 then 'todos com perfil' else n||' usuario(s) sem perfil (crie o perfil em Usuarios)' end));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Usuarios sem perfil','status','alerta','detalhe','nao foi possivel checar auth.users')); end;

  -- 19) Perfis com cargo invalido (legado)
  begin
    select count(*) into n from perfis where role not in ('Administrador','Diretoria','Account Manager','Sales Engineer','Intern');
    r := r || jsonb_build_array(jsonb_build_object('item','Cargos validos','status',case when n=0 then 'ok' else 'alerta' end,'detalhe',case when n=0 then 'todos validos' else n||' perfil(is) com cargo legado' end));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Cargos validos','status','erro','detalhe',sqlerrm)); end;

  -- 20) Rodadas presas (nao concluidas e antigas)
  begin
    select count(*) into n from rodadas where status_execucao is distinct from 'concluida' and data_rodada < current_date - 1;
    r := r || jsonb_build_array(jsonb_build_object('item','Rodadas presas','status',case when n=0 then 'ok' else 'alerta' end,'detalhe',n||' rodada(s) antiga(s) nao concluida(s)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Rodadas presas','status','erro','detalhe',sqlerrm)); end;

  -- 21) Fornecedores sem nome
  begin
    select count(*) into n from fornecedores where nome_fornecedor is null or nome_fornecedor='';
    r := r || jsonb_build_array(jsonb_build_object('item','Fornecedores sem nome','status',case when n=0 then 'ok' else 'alerta' end,'detalhe',n||' sem nome (PNCP nao trouxe)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Fornecedores sem nome','status','erro','detalhe',sqlerrm)); end;

  -- 22) Contatos orfaos -> limpa
  begin
    delete from contatos ct where ct.oportunidade_id is not null and not exists (select 1 from oportunidades o where o.id=ct.oportunidade_id);
    get diagnostics n = row_count;
    r := r || jsonb_build_array(jsonb_build_object('item','Contatos orfaos','status',case when n>0 then 'corrigido' else 'ok' end,'detalhe',n||' removido(s)'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Contatos orfaos','status','erro','detalhe',sqlerrm)); end;

  -- 23) Views do painel todas consultaveis
  begin
    quebradas := 0;
    foreach v in array array['vw_dashboard_executivo','vw_top_10_semana','vw_oportunidades_por_responsavel','vw_concorrentes','vw_qualidade_base','vw_historico_rodadas'] loop
      begin execute 'select 1 from '||v||' limit 1'; exception when others then quebradas := quebradas + 1; end;
    end loop;
    r := r || jsonb_build_array(jsonb_build_object('item','Views do painel','status',case when quebradas=0 then 'ok' else 'alerta' end,'detalhe',case when quebradas=0 then 'todas as 6 OK' else quebradas||' view(s) com problema' end));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Views do painel','status','erro','detalhe',sqlerrm)); end;

  -- 23b) Lista plana (lista_flat) — fonte RÁPIDA da Lista de Ataque. Se sumir/zerar/defasar, repovoa.
  --      (Foi o que resolveu de vez a "Lista de Ataque vazia": tabela achatada e indexada.)
  begin
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='lista_flat') then
      select count(*) into n from lista_flat;
      select coalesce(total_oportunidades,0) into n2 from rodadas order by data_rodada desc, id desc limit 1;
      if n = 0 or (n2 > 0 and n < n2 * 0.5) then
        perform public.refresh_lista_flat();
        select count(*) into n from lista_flat;
        r := r || jsonb_build_array(jsonb_build_object('item','Lista de Ataque (tabela rapida)','status','corrigido','detalhe','lista_flat estava vazia/defasada — repovoada agora ('||n||' linhas)'));
      else
        r := r || jsonb_build_array(jsonb_build_object('item','Lista de Ataque (tabela rapida)','status','ok','detalhe',n||' linhas (atualizada)'));
      end if;
    else
      r := r || jsonb_build_array(jsonb_build_object('item','Lista de Ataque (tabela rapida)','status','alerta','detalhe','lista_flat ausente — aplicar a migracao lista_flat'));
    end if;
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Lista de Ataque (tabela rapida)','status','erro','detalhe',sqlerrm)); end;

  -- 24) Estatisticas/performance (por ultimo)
  begin
    analyze oportunidades; analyze contratos; analyze orgaos; analyze editais;
    r := r || jsonb_build_array(jsonb_build_object('item','Estatisticas/performance','status','ok','detalhe','ANALYZE executado'));
  exception when others then r := r || jsonb_build_array(jsonb_build_object('item','Estatisticas/performance','status','erro','detalhe',sqlerrm)); end;

  return r;
end $fn$;

revoke all on function public.atlas_doctor() from public, anon;
grant execute on function public.atlas_doctor() to authenticated, service_role;
