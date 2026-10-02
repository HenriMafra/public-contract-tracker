import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { StatCard, Card, CardPad, PageTitle, Empty } from "@/components/ui/primitives";
import { Top10Table } from "@/components/dashboard/Top10Table";
import { getDashboard, getTop10, getPorResponsavel, getConcorrentes } from "@/lib/queries/views";
import { brlMi } from "@/lib/utils/format";
import { LiveDashboard } from "@/components/realtime/LiveDashboard";
import { supabaseServer } from "@/lib/supabase/server";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";
const SCOPED = ["Account Manager"]; // "Sua área" só p/ AM; resto vê tudo

/** "Sua área": puxa, JÁ ESCOPADO ao responsável (RLS), as oportunidades dos órgãos dele
 *  + os editais abertos na sua UF. É o que garante que cada um receba o que é seu. */
async function getMinhaArea(userId: string) {
  try {
    const sb = supabaseServer();
    const { data: pu } = await sb.from("perfil_ufs").select("uf").eq("user_id", userId);
    const ufs = (pu || []).map((r: any) => r.uf).filter(Boolean);
    const { data: pf } = await sb.from("perfis").select("orgaos_foco").eq("user_id", userId).single();
    const foco: string[] = Array.isArray(pf?.orgaos_foco) ? (pf!.orgaos_foco as string[]) : [];
    let oq: any = sb.from("vw_lista_ataque_atual").select("id", { count: "exact", head: true }).or("status_validacao.is.null,status_validacao.neq.Descartada");
    if (foco.length) oq = oq.in("orgao_padronizado", foco);
    const { count: oppCount } = await oq;
    let eq: any = sb.from("editais").select("id", { count: "exact", head: true }).eq("proposta_aberta", true);
    if (ufs.length) eq = eq.in("uf", ufs);
    const { count: edCount } = await eq;
    return { ufs, focoN: foco.length, oppCount: oppCount || 0, edCount: edCount || 0 };
  } catch { return null; }
}

function KpiLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30">{children}</Link>;
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!can(user.role, "view_dashboards")) return <Shell user={user}><Forbidden /></Shell>;
  const [d, top, resp, conc] = await Promise.all([getDashboard(), getTop10(), getPorResponsavel(), getConcorrentes()]);
  const area = SCOPED.includes(user.role) ? await getMinhaArea(user.id) : null;

  return (
    <Shell user={user}>
      <LiveDashboard>
        <PageTitle title="Dashboard Executivo" subtitle={d ? `Última rodada: ${d.data_rodada} · clique em qualquer indicador para abrir a lista` : "Visão geral dos números da semana."} />

        {area && (
          <Card className="mb-4 border-brand/30"><CardPad>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Star size={15} className="text-brand" />
              <span className="font-bold text-fg">Sua área{area.ufs.length ? ` · ${area.ufs.join(", ")}` : ""}</span>
              {area.focoN > 0 ? <span className="text-xs text-muted">foco em {area.focoN} órgão(s)</span> : <span className="text-xs text-muted">defina seus órgãos em Minha Conta</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/lista-ataque" className="rounded-xl border border-line p-3 hover:border-brand hover:shadow-soft transition">
                <div className="text-2xl font-extrabold text-brand">{area.oppCount.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted">oportunidades ativas nos seus órgãos</div>
              </Link>
              <Link href="/licitacoes" className="rounded-xl border border-line p-3 hover:border-brand hover:shadow-soft transition">
                <div className="text-2xl font-extrabold text-emerald-500">{area.edCount.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted">editais abertos na sua área agora</div>
              </Link>
            </div>
            <p className="text-[11px] text-muted mt-2">Atualiza sozinho a cada coleta — é o que é seu, puxado automaticamente. Clique para abrir já filtrado.</p>
          </CardPad></Card>
        )}
        {!d ? (
          <Empty>Os indicadores aparecem aqui assim que a rodada da semana for processada.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KpiLink href="/lista-ataque"><StatCard label="Oportunidades" value={d.oportunidades ?? "—"} accent="text-brand" sub="ver lista de ataque" /></KpiLink>
              <KpiLink href="/lista-ataque?urgencia=Crítica"><StatCard label="Críticas" value={d.criticas ?? "—"} accent="text-red-500" sub="urgência crítica" /></KpiLink>
              <StatCard label="Valor mapeado" value={brlMi(d.valor_total_mapeado)} accent="text-green-500" sub="contratos na mira" />
              <KpiLink href="/lista-ataque"><StatCard label="Vencidos / até 30 dias" value={`${d.vencidos ?? 0} / ${d.vencendo_30d ?? 0}`} accent="text-amber-500" sub="janela de ataque" /></KpiLink>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiLink href="/lista-ataque?uf=DF"><StatCard label="DF" value={d.df ?? 0} /></KpiLink>
              <KpiLink href="/lista-ataque?uf=GO"><StatCard label="GO" value={d.go ?? 0} /></KpiLink>
              <KpiLink href="/distribuicao"><StatCard label="Responsáveis" value={(resp || []).length} sub="por carteira" /></KpiLink>
              <KpiLink href="/fornecedores"><StatCard label="Concorrentes" value={(conc || []).length} sub="mapeados" /></KpiLink>
            </div>
            <details className="mb-6 -mt-1">
              <summary className="text-xs text-brand hover:underline cursor-pointer list-none inline-flex items-center gap-1">❔ O que cada indicador significa</summary>
              <div className="mt-2 text-xs text-muted bg-surface2/40 border border-line rounded-lg px-3 py-2.5 leading-relaxed max-w-3xl">
                <b className="text-fg">Oportunidades</b>: contratos que valem atacar nesta rodada. · <b className="text-fg">Críticas</b>: urgência máxima (vencendo logo e/ou alto valor). · <b className="text-fg">Valor mapeado</b>: soma dos contratos no radar. · <b className="text-fg">Vencidos / até 30 dias</b>: já venceram / vencem em até 30 dias (janela quente). · <b className="text-fg">DF / GO</b>: divisão por estado. · <b className="text-fg">Responsáveis</b>: pessoas com carteira. · <b className="text-fg">Concorrentes</b>: fornecedores mapeados. Clique em qualquer um para abrir a lista.
              </div>
            </details>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card><CardPad>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-fg">Top 10 da Semana</div>
                    <Link href="/lista-ataque" className="text-xs font-semibold text-brand hover:underline">ver tudo →</Link>
                  </div>
                  <Top10Table rows={(top as any[]) || []} />
                </CardPad></Card>
              </div>
              <Card><CardPad>
                <div className="font-bold text-fg mb-3">Por Responsável</div>
                {(resp || []).length === 0 ? <Empty>—</Empty> : (
                  <ul className="space-y-1">
                    {resp.map((r: any, i: number) => (
                      <li key={i} className="flex items-center justify-between text-sm border-b border-line last:border-0 py-2">
                        <span className="font-medium text-fg truncate">{r.responsavel || "—"}</span>
                        <span className="text-muted whitespace-nowrap ml-2">{r.qtd} · {brlMi(r.valor_total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardPad></Card>
            </div>
          </>
        )}
      </LiveDashboard>
    </Shell>
  );
}
