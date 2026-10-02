import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { escopoVerComo } from "@/lib/auth/verComo";

/** Trilha de atividade de um contrato (quem fez o quê, quando). */
export async function getTrilhaOportunidade(oppId: number) {
  try {
    const { data } = await supabaseAdmin()
      .from("audit_logs").select("usuario,perfil,acao,detalhes,created_at")
      .eq("oportunidade_id", oppId).order("id", { ascending: false }).limit(100);
    return data || [];
  } catch { return []; }
}

/** Helpers de leitura das views/tabelas do ATLAS B2G. RLS é aplicada pela sessão. */
async function q(table: string, build?: (qb: any) => any) {
  try {
    const sb = supabaseServer();
    let qb: any = sb.from(table).select("*");
    if (build) qb = build(qb);
    const { data, error } = await qb;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: e?.message || String(e) };
  }
}

export const getDashboard = async () => (await q("vw_dashboard_executivo")).data?.[0] || null;
export const getTop10 = async () => (await q("vw_top_10_semana")).data;
export const getPorResponsavel = async () => (await q("vw_oportunidades_por_responsavel")).data;
export const getConcorrentes = async () => (await q("vw_concorrentes")).data;
export const getQualidade = async () => (await q("vw_qualidade_base")).data;
export const getHistoricoRodadas = async () => (await q("vw_historico_rodadas")).data;

export async function getListaAtaque(filtros: Record<string, string> = {}) {
  const vc = await escopoVerComo(); // admin pré-visualizando como outro usuário
  const v = (filtros.vencendo || "").trim();
  const comVenc = !!v;
  // O PostgREST corta em 1000 linhas/requisição → paginamos com .range() para trazer MAIS
  // que 1000 (o teto antigo). Top por score; ao filtrar por vencimento, amplia o horizonte.
  const CAP = comVenc ? 25000 : 8000;
  const PAGE = 1000;
  const sb = supabaseServer();
  const buildQuery = (from: number, end: number) => {
    let qb: any = sb.from("vw_lista_ataque_atual").select("*");
    if (vc && !vc.veTudo) qb = qb.in("uf", vc.ufs.length ? vc.ufs : ["__none__"]);
    if (filtros.uf) qb = qb.eq("uf", filtros.uf);
    if (filtros.categoria) qb = qb.eq("categoria_principal", filtros.categoria);
    if (filtros.urgencia) qb = qb.eq("urgencia_comercial", filtros.urgencia);
    if (filtros.scoreMin) qb = qb.gte("score_comercial", Number(filtros.scoreMin));
    if (v === "vencidos") qb = qb.lt("dias_ate_vencimento", 0);
    else if (v.endsWith("+")) qb = qb.gte("dias_ate_vencimento", parseInt(v, 10) || 0);
    else if (v.includes("-")) { const [a, b] = v.split("-").map((x) => parseInt(x, 10)); if (!Number.isNaN(a) && !Number.isNaN(b)) qb = qb.gte("dias_ate_vencimento", a).lte("dias_ate_vencimento", b); }
    else if (v) { const n = parseInt(v, 10); if (!Number.isNaN(n)) qb = qb.gte("dias_ate_vencimento", 0).lte("dias_ate_vencimento", n); }
    return qb.order("score_comercial", { ascending: false }).order("id", { ascending: true }).range(from, end);
  };
  const all: any[] = [];
  // Antes: até 25 requisições SEQUENCIAIS ao Supabase numa única invocação do Worker — isso
  // estava estourando o limite de CPU/tempo da Cloudflare ("exceededResources") quando a
  // filtragem por vencimento ativava o CAP de 25000. Corrigido 2026-07-03: busca a 1ª página
  // sequencial (pra saber se vale a pena continuar) e, se vier cheia, dispara o RESTO em
  // paralelo (Promise.all) — mesmo total de dados, muito menos tempo de parede.
  try {
    const primeiraEnd = Math.min(PAGE, CAP) - 1;
    const { data: primeira, error: err0 } = await buildQuery(0, primeiraEnd);
    if (!err0 && primeira?.length) {
      all.push(...primeira);
      if (primeira.length === primeiraEnd + 1 && CAP > PAGE) {
        const restos: Promise<any>[] = [];
        for (let from = PAGE; from < CAP; from += PAGE) {
          const end = Math.min(from + PAGE, CAP) - 1;
          restos.push(buildQuery(from, end).then((r: any) => r.data || []));
        }
        const paginas = await Promise.all(restos);
        for (const pg of paginas) {
          if (!pg.length) break;
          all.push(...pg);
          if (pg.length < PAGE) break;
        }
      }
    }
  } catch { /* devolve o que já tiver */ }
  return all;
}

/** Total de oportunidades na rodada vigente (respeita o escopo de UF do "Ver como"). */
export async function getOportunidadesTotal(filtros: Record<string, string> = {}) {
  const vc = await escopoVerComo();
  try {
    let qb: any = supabaseServer().from("vw_lista_ataque_atual").select("id", { count: "exact", head: true });
    if (vc && !vc.veTudo) qb = qb.in("uf", vc.ufs.length ? vc.ufs : ["__none__"]);
    if (filtros.uf) qb = qb.eq("uf", filtros.uf);
    const { count } = await qb;
    return count || 0;
  } catch { return 0; }
}

/** Oportunidades já DECIDIDAS (não-Pendente) — destino de cada decisão, com quem/quando decidiu. */
export async function getDecididas() {
  const vc = await escopoVerComo();
  try {
    let qb: any = supabaseServer().from("vw_lista_ataque_atual")
      .select("id,id_oportunidade,orgao_padronizado,nome_orgao,uf,municipio,categoria_principal,valor_total,dias_ate_vencimento,fim_vigencia,nome_fornecedor,score_comercial,responsavel_atribuido,status_validacao")
      .neq("status_validacao", "Pendente");
    if (vc && !vc.veTudo) qb = qb.in("uf", vc.ufs.length ? vc.ufs : ["__none__"]);
    const { data } = await qb.order("score_comercial", { ascending: false }).limit(20000);
    const rows = data || [];
    const ids = rows.map((r: any) => r.id).filter(Boolean);
    const map: Record<number, any> = {};
    if (ids.length) {
      const { data: dec } = await supabaseAdmin().from("oportunidades").select("id,decidido_por,decidido_em").in("id", ids);
      (dec || []).forEach((d: any) => { map[d.id] = d; });
    }
    return rows.map((r: any) => ({ ...r, decidido_por: map[r.id]?.decidido_por || null, decidido_em: map[r.id]?.decidido_em || null }));
  } catch { return []; }
}

/** BASE — contratos onde a ENTERPRISECORE é a fornecedora (incumbente). Vigentes + a vencer (renovação). */
export async function getBaseNtsec() {
  const vc = await escopoVerComo();
  const res = await q("vw_lista_ataque_atual", (qb) => {
    qb = qb.ilike("nome_fornecedor", "%enterprisecore%");
    if (vc && !vc.veTudo) qb = qb.in("uf", vc.ufs.length ? vc.ufs : ["__none__"]);
    return qb.order("dias_ate_vencimento", { ascending: true }).limit(50000);
  });
  return res.data;
}

/** Oportunidades/contratos de um FABRICANTE específico (ex.: "Check Point"). Para a Base. */
export async function getPorFabricante(fab: string) {
  const vc = await escopoVerComo();
  const res = await q("vw_lista_ataque_atual", (qb) => {
    qb = qb.ilike("fabricante", `%${fab}%`);
    if (vc && !vc.veTudo) qb = qb.in("uf", vc.ufs.length ? vc.ufs : ["__none__"]);
    return qb.order("dias_ate_vencimento", { ascending: true }).limit(50000);
  });
  return res.data;
}

/** Contratos que o usuário assumiu (responsavel_atribuido = ele). Pipeline pessoal. */
// Consulta direto nas tabelas (não na vw_lista_ataque_atual, que só atualiza a cada 10min via
// a materialized view mv_lista_ataque_atual) — "Painel Tático" precisa refletir na hora quando
// alguém assume um contrato (Ação corrigida em 2026-07-03). Cada pessoa tem poucos contratos
// assumidos, então a consulta é leve mesmo sem passar pela view otimizada.
export async function getMeusContratos(nome: string) {
  if (!nome) return [];
  try {
    const sb = supabaseServer();
    const { data } = await sb.from("oportunidades")
      .select("id,id_oportunidade,status_comercial,status_validacao,score_comercial,fabricante,orgaos(nome_padronizado,nome_orgao,uf),contratos(objeto_original,valor_total,dias_ate_vencimento,categoria_principal,status_contrato)")
      .eq("responsavel_atribuido", nome)
      .order("score_comercial", { ascending: false })
      .limit(2000);
    return (data || []).map((o: any) => ({
      id: o.id, id_oportunidade: o.id_oportunidade, status_comercial: o.status_comercial, status_validacao: o.status_validacao,
      orgao_padronizado: o.orgaos?.nome_padronizado, nome_orgao: o.orgaos?.nome_orgao, uf: o.orgaos?.uf,
      categoria_principal: o.contratos?.categoria_principal,
      objeto_original: o.contratos?.objeto_original,
      valor_total: o.contratos?.valor_total,
      dias_ate_vencimento: o.contratos?.dias_ate_vencimento,
      status_contrato: o.contratos?.status_contrato,
      fabricante: o.fabricante,
    }));
  } catch { return []; }
}

export async function getOportunidade(id: string) {
  const sb = supabaseServer();
  try {
    // id_oportunidade (ex.: "ATK-00015") NÃO é único — é numerado por rodada, então
    // o mesmo código existe em rodadas diferentes. Por isso buscamos pela PK `id`
    // (única) quando o parâmetro é numérico; e, quando vier o código, pegamos a
    // ocorrência mais recente (maior id = rodada atual) para nunca abrir/editar a errada.
    const numerico = /^\d+$/.test(String(id));
    const base = sb.from("oportunidades").select("*");
    const { data } = numerico
      ? await base.eq("id", Number(id)).limit(1)
      : await base.eq("id_oportunidade", id).order("id", { ascending: false }).limit(1);
    const op = data?.[0]; if (!op) return null;
    const vc = await escopoVerComo();
    const [{ data: org }, { data: contr }, { data: forn }, { data: hist }, { data: contatos }, { data: tarefas }] = await Promise.all([
      sb.from("orgaos").select("*").eq("id", op.orgao_id).limit(1),
      sb.from("contratos").select("*").eq("id", op.contrato_id).limit(1),
      sb.from("fornecedores").select("*").eq("id", op.fornecedor_id).limit(1),
      sb.from("oportunidade_historico").select("*").eq("oportunidade_id", op.id).order("rodada_id"),
      sb.from("contatos").select("*").eq("oportunidade_id", op.id).order("data_contato", { ascending: false }),
      sb.from("tarefas").select("*").eq("oportunidade_id", op.id),
    ]);
    if (vc && !vc.veTudo && !vc.ufs.includes(org?.[0]?.uf)) return null; // fora do escopo (UF) na visão simulada
    return { op, orgao: org?.[0], contrato: contr?.[0], fornecedor: forn?.[0], historico: hist || [], contatos: contatos || [], tarefas: tarefas || [] };
  } catch { return null; }
}

export async function getOrgao(id: string) {
  const sb = supabaseServer();
  try {
    const { data: orgs } = await sb.from("orgaos").select("*").eq("id", id).limit(1);
    const org = orgs?.[0]; if (!org) return null;
    const { data: contratos } = await sb.from("contratos").select("*").eq("orgao_id", org.id);
    const { data: oportunidades } = await sb.from("oportunidades").select("*").eq("orgao_id", org.id);
    const lista = contratos || [];
    // A tabela 'contratos' guarda só fornecedor_id (FK). Resolvemos o NOME aqui
    // numa única consulta (id -> nome_padronizado) para não exibir número na ficha.
    const ids = Array.from(new Set(lista.map((c: any) => c.fornecedor_id).filter((x: any) => x != null)));
    if (ids.length) {
      const { data: forns } = await sb.from("fornecedores").select("id,nome_padronizado,cnpj").in("id", ids);
      const mapa = new Map((forns || []).map((f: any) => [f.id, f.nome_padronizado || f.cnpj || null]));
      for (const c of lista) (c as any).nome_fornecedor = mapa.get(c.fornecedor_id) || null;
    }
    return { org, contratos: lista, oportunidades: oportunidades || [] };
  } catch { return null; }
}

/** EDITAIS / LICITAÇÕES (fonte nova: contratações do PNCP). Abertos primeiro, por prazo. */
export async function getEditais(filtros: { uf?: string; categoria?: string; abertos?: boolean; ufs?: string[] } = {}) {
  // PostgREST corta em 1000 linhas por requisição → paginamos com .range() para trazer TODOS.
  // Mesmo bug de CPU/tempo estourado da Lista de Ataque (2026-07-03): até 20 requisições
  // SEQUENCIAIS numa única invocação do Worker. Corrigido igual — 1ª página sequencial, resto
  // em paralelo.
  const PAGE = 1000; const MAXPAG = 20;
  const buildQuery = (from: number) => {
    const sb = supabaseAdmin();
    let qb: any = sb.from("editais").select("*");
    if (filtros.ufs && filtros.ufs.length) qb = qb.in("uf", filtros.ufs); // escopo do responsável (suas UFs)
    if (filtros.uf) qb = qb.eq("uf", filtros.uf);
    if (filtros.categoria) qb = qb.eq("categoria", filtros.categoria);
    if (filtros.abertos) qb = qb.eq("proposta_aberta", true);
    return qb
      .order("proposta_aberta", { ascending: false })
      .order("encerramento_proposta", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }) // desempate único → paginação .range() estável (sem duplicar/pular)
      .range(from, from + PAGE - 1);
  };
  const all: any[] = [];
  try {
    const { data: primeira, error: err0 } = await buildQuery(0);
    if (!err0 && primeira?.length) {
      all.push(...primeira);
      if (primeira.length === PAGE) {
        const restos: Promise<any>[] = [];
        for (let i = 1; i < MAXPAG; i++) restos.push(buildQuery(i * PAGE).then((r: any) => r.data || []));
        const paginas = await Promise.all(restos);
        for (const pg of paginas) {
          if (!pg.length) break;
          all.push(...pg);
          if (pg.length < PAGE) break;
        }
      }
    }
  } catch { /* devolve o que já tiver */ }
  return all;
}

export async function getDistinct(view: string, col: string) {
  const res = await q(view, (qb) => qb.select(col));
  return Array.from(new Set((res.data || []).map((r: any) => r[col]).filter(Boolean))).sort();
}
