import Link from "next/link";
import { requireUser, nomeResponsavel } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Card, CardPad, Badge, Empty, Table } from "@/components/ui/primitives";
import { OpportunityActions } from "@/components/OpportunityActions";
import { EnviarBacklog } from "@/components/backlog/EnviarBacklog";
import { OpportunityActionBar } from "@/components/OpportunityActionBar";
import { AdminReset } from "@/components/admin/AdminReset";
import { OrgAvatar } from "@/components/ui/OrgAvatar";
import { NomeFornecedor } from "@/components/ui/NomeFornecedor";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { getOportunidade, getTrilhaOportunidade } from "@/lib/queries/views";
import { brl, fmtDate, corUrgencia, corPrioridade, cn } from "@/lib/utils/format";
import { ChevronDown, Lightbulb, History, MessageSquare, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

function diasTone(d: any) {
  if (typeof d !== "number") return "bg-surface2 text-muted";
  if (d < 0) return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (d <= 30) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (d <= 90) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
  return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
}
function diasLabel(d: any, fim: any) {
  if (typeof d !== "number") return fim ? fmtDate(fim) : "—";
  if (d < 0) return `venceu há ${Math.abs(d)} dias`;
  return `vence em ${d} dias`;
}

export default async function OportunidadePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const data = await getOportunidade(params.id);
  if (!data) return <Shell user={user}><Empty>Oportunidade não encontrada (ou banco não conectado).</Empty></Shell>;
  const { op, orgao, contrato, fornecedor, historico, contatos } = data;
  const trilha = await getTrilhaOportunidade(op.id);
  const canAct = can(user.role, "update_status");
  const isAdmin = user.role === "Administrador";
  const meu = nomeResponsavel(user);
  const valor = contrato?.valor_total ?? op?.valor_total ?? 0;
  const dias = contrato?.dias_ate_vencimento;

  const Stat = ({ k, v, tone }: { k: string; v: any; tone?: string }) => (
    <div className="rounded-xl border border-line bg-surface2/50 px-3 py-2.5">
      <div className="text-xs uppercase tracking-wide text-muted font-semibold">{k}</div>
      <div className={cn("font-bold text-fg mt-0.5", tone)}>{v ?? "—"}</div>
    </div>
  );

  return (
    <Shell user={user}>
      <div className="text-xs text-muted mb-2">
        <Link href="/lista-ataque" className="hover:text-brand">Lista de Ataque</Link> › {op.id_oportunidade}
      </div>

      {/* PARTE 1 — cabeçalho centralizado: logo + órgão (destaque) + UF · município · tipo */}
      <Card><CardPad>
        <div className="flex flex-col items-center text-center">
          <OrgAvatar name={orgao?.nome_padronizado || orgao?.nome_orgao} sigla={orgao?.sigla} size={62} />
          <h1 className="text-2xl font-extrabold text-brand leading-snug mt-3">{orgao?.nome_padronizado || orgao?.nome_orgao || "Órgão"}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2.5 text-sm">
            {orgao?.uf && <span className="font-bold text-fg">{orgao.uf}</span>}
            {orgao?.municipio && <><span className="text-line">·</span><span className="text-muted">{orgao.municipio}</span></>}
            {contrato?.categoria_principal && <><span className="text-line">·</span><span className="font-semibold text-brand">{contrato.categoria_principal}</span></>}
            {(contrato?.fabricante || op?.fabricante) && <><span className="text-line">·</span><span className="font-semibold text-fg inline-flex items-center gap-1">🏷 {contrato?.fabricante || op?.fabricante}</span></>}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge className={corPrioridade(op.prioridade)}>{op.prioridade} · {op.score_comercial}</Badge>
            <Badge className={corUrgencia(op.urgencia_comercial)}>{op.urgencia_comercial}</Badge>
          </div>
        </div>
      </CardPad></Card>

      {/* PARTE 2 — objeto em destaque (uma das primeiras coisas a notar) */}
      <Card className="mt-4 border-brand/30 bg-brand/5"><CardPad>
        <div className="text-xs uppercase tracking-wider text-brand font-bold mb-1.5 text-center">O que é (objeto)</div>
        <p className="text-base text-fg leading-relaxed text-center font-medium max-w-3xl mx-auto">{contrato?.objeto_original || contrato?.objeto_normalizado || "—"}</p>
      </CardPad></Card>

      {/* PARTE 3 — fatos-chave, centralizados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="rounded-xl border border-line bg-surface2/50 px-3 py-3 text-center">
          <div className="text-xs uppercase tracking-wide text-muted font-semibold">Valor do contrato</div>
          <div className="text-xl font-extrabold text-fg mt-1">{brl(valor)}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface2/50 px-3 py-3 text-center">
          <div className="text-xs uppercase tracking-wide text-muted font-semibold">Quando vence</div>
          <div className="text-2xl font-extrabold text-fg mt-1 leading-tight">{contrato?.fim_vigencia ? fmtDate(contrato.fim_vigencia) : "—"}</div>
          {typeof dias === "number" && <span className={cn("inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5", diasTone(dias))}>{diasLabel(dias, contrato?.fim_vigencia)}</span>}
        </div>
        <div className="rounded-xl border border-line bg-surface2/50 px-3 py-3 text-center">
          <div className="text-xs uppercase tracking-wide text-muted font-semibold">Fornecedor atual</div>
          <div className="font-bold text-fg mt-1 break-words"><NomeFornecedor name={fornecedor?.nome_fornecedor} />{fornecedor?.possivel_concorrente ? " ⚔️" : ""}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface2/50 px-3 py-3 text-center">
          <div className="text-xs uppercase tracking-wide text-muted font-semibold">Responsável</div>
          <div className="font-bold text-fg mt-1">{op.responsavel_atribuido || <span className="text-muted font-medium">sem dono — assuma</span>}</div>
        </div>
      </div>

      {/* PARTE 4 — ações: Abrir no PNCP / Assumir + Decisão (no mesmo lugar). Pedido 2026-07-02:
          TODOS os perfis podem assumir/decidir (é assim que o contrato cai no Painel Tático
          deles) — só o resto da ficha (atividade/contatos/histórico/backlog) ficou restrito
          ao Administrador, pra manter a interface limpa sem tirar a função. */}
      <Card className="mt-4"><CardPad>
        <OpportunityActionBar oppId={op.id} linkFonte={contrato?.link_fonte} statusValidacao={op.status_validacao} statusComercial={op.status_comercial} responsavel={op.responsavel_atribuido} meuNome={meu} canAct={canAct} />
        {isAdmin && can(user.role, "reset_decisao") && (
          <div className="mt-2 flex justify-end"><AdminReset oppId={op.id} /></div>
        )}
        {isAdmin && trilha[0] && (
          <div className="text-xs text-muted mt-2.5">Última atividade: {trilha[0].detalhes || trilha[0].acao} — <b className="text-fg/80">{trilha[0].usuario || "—"}</b>{trilha[0].created_at ? " · " + new Date(trilha[0].created_at).toLocaleString("pt-BR") : ""}</div>
        )}
      </CardPad></Card>

      {/* INTELIGÊNCIA COMERCIAL — colapsável, explicada */}
      <details className="mt-4 group">
        <summary className="list-none cursor-pointer">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-soft hover:bg-surface2 transition">
            <Lightbulb size={16} className="text-brand" />
            <div className="font-bold text-fg">Inteligência comercial</div>
            <div className="text-xs text-muted hidden sm:block">— por que priorizamos, score, argumento e próxima ação</div>
            <ChevronDown size={18} className="ml-auto text-muted transition group-open:rotate-180" />
          </div>
        </summary>
        <Card className="mt-2"><CardPad>
          <p className="text-sm"><b>Por que priorizamos (score {op.score_comercial ?? "—"}):</b> {op.motivo_prioridade || "—"}</p>
          <p className="text-sm mt-2"><b>Argumento comercial sugerido:</b> {op.argumento_comercial_sugerido || "—"}</p>
          <p className="text-sm mt-2"><b>Próxima ação recomendada:</b> {op.proxima_acao_recomendada || "—"}</p>
          {fornecedor?.grau_ameaca && <p className="text-sm mt-2"><b>Ameaça do fornecedor:</b> <Badge tone={fornecedor.grau_ameaca === "Alto" ? "red" : "amber"}>{fornecedor.grau_ameaca}</Badge></p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-line">
            {[["Nº contrato", contrato?.numero_contrato], ["Nº processo", contrato?.numero_processo],
              ["Início vigência", fmtDate(contrato?.inicio_vigencia)], ["Status contrato", contrato?.status_contrato],
              ["Tipo", op.tipo_oportunidade], ["Janela comercial", op.janela_comercial]].map(([k, v]: any) => (
              <div key={k}><div className="text-xs uppercase text-muted font-semibold">{k}</div><div className="text-sm font-medium text-fg">{v ?? "—"}</div></div>
            ))}
          </div>
        </CardPad></Card>
      </details>

      {/* Atividade / Contatos / Histórico / Backlog: só Administrador (pedido 2026-07-02) —
          os demais perfis usam a ficha só pra consulta/pesquisa do contrato. */}
      {isAdmin && (
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          {/* ATIVIDADE / LOG */}
          <div className="lg:col-span-2 space-y-4">
            <CollapsibleCard title="Atividade do contrato" icon={<ClipboardList size={16} className="text-brand" />}>
              {trilha.length === 0 ? <Empty>Nenhuma ação registrada ainda. Assuma o contrato ou registre uma decisão acima.</Empty> : (
                <ol className="space-y-2.5">
                  {trilha.map((t: any, i: number) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-fg">{t.detalhes || t.acao}</div>
                        <div className="text-xs text-muted">{t.usuario || "—"}{t.perfil ? ` · ${t.perfil}` : ""} · {t.created_at ? new Date(t.created_at).toLocaleString("pt-BR") : "—"}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CollapsibleCard>

            <CollapsibleCard title={`Contatos registrados (${contatos.length})`} icon={<MessageSquare size={16} className="text-brand" />}>
              {contatos.length === 0 ? <Empty>Nenhum contato registrado.</Empty> : contatos.map((c: any, i: number) => (
                <div key={i} className="text-sm border-b border-line py-2.5 last:border-0">
                  <div className="font-semibold text-fg">{c.pessoa_contatada || "—"}<span className="font-normal text-muted"> · {fmtDate(c.data_contato)}{c.canal ? ` · ${c.canal}` : ""}</span></div>
                  {(c.email || c.telefone) && <div className="text-xs text-muted break-words">{[c.email, c.telefone].filter(Boolean).join(" · ")}</div>}
                  {c.resumo && <div className="text-fg/80 mt-0.5 whitespace-pre-wrap">{c.resumo}</div>}
                  {c.proxima_acao && <div className="text-xs text-muted mt-0.5">próxima ação: {c.proxima_acao}</div>}
                </div>
              ))}
            </CollapsibleCard>

            <details className="group">
              <summary className="list-none cursor-pointer">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-soft hover:bg-surface2 transition">
                  <History size={16} className="text-brand" /><div className="font-bold text-fg">Histórico de rodadas</div>
                  <ChevronDown size={18} className="ml-auto text-muted transition group-open:rotate-180" />
                </div>
              </summary>
              <Card className="mt-2"><CardPad>
                {historico.length === 0 ? <Empty>Sem histórico.</Empty> : (
                  <Table head={["Score", "Urgência", "Valor", "Dias", "Status na rodada"]}>
                    {historico.map((h: any, i: number) => (
                      <tr key={i} className="border-b border-line"><td className="px-3 py-1.5 font-semibold">{h.score_comercial}</td><td className="px-3 py-1.5">{h.urgencia_comercial}</td><td className="px-3 py-1.5">{brl(h.valor_total)}</td><td className="px-3 py-1.5">{h.dias_ate_vencimento}</td><td className="px-3 py-1.5">{h.status_na_rodada}</td></tr>
                    ))}
                  </Table>
                )}
              </CardPad></Card>
            </details>
          </div>

          {/* LATERAL: registrar contato + ficha do órgão */}
          <div className="space-y-4">
            {can(user.role, "register_contact") && (
              <OpportunityActions oppId={op.id} canAssign={false} canContact={true} canValidate={false} />
            )}
            {can(user.role, "backlog_view") && (
              <Card><CardPad>
                <div className="text-xs font-semibold text-muted mb-2">Backlog (Trello)</div>
                <EnviarBacklog oppId={op.id} titulo={`${orgao?.nome_padronizado || orgao?.nome_orgao || "Contrato"}${contrato?.categoria_principal ? " · " + contrato.categoria_principal : ""}`} />
              </CardPad></Card>
            )}
            {orgao && <Card><CardPad><Link href={`/orgaos/${orgao.id}`} className="text-brand text-sm font-semibold hover:underline">Ver ficha do órgão →</Link></CardPad></Card>}
          </div>
        </div>
      )}
      {!isAdmin && orgao && (
        <Card className="mt-4"><CardPad><Link href={`/orgaos/${orgao.id}`} className="text-brand text-sm font-semibold hover:underline">Ver ficha do órgão →</Link></CardPad></Card>
      )}
    </Shell>
  );
}
