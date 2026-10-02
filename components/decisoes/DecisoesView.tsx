"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Empty, Table } from "@/components/ui/primitives";
import { brl, fmtDate, semAcento } from "@/lib/utils/format";
import { Search, ChevronRight, RotateCcw } from "lucide-react";

const TABS = [
  { key: "Validada", label: "Validadas (carteira)", sub: "oportunidades confirmadas — viram carteira", dot: "bg-emerald-500", cls: "text-emerald-600 dark:text-emerald-400" },
  { key: "Em análise", label: "Em análise", sub: "ainda sendo avaliadas", dot: "bg-amber-500", cls: "text-amber-600 dark:text-amber-400" },
  { key: "Monitoramento", label: "Monitoradas", sub: "acompanhar sem agir agora", dot: "bg-blue-500", cls: "text-blue-600 dark:text-blue-400" },
  { key: "Descartada", label: "Descartadas", sub: "não interessam (reversível)", dot: "bg-red-500", cls: "text-red-600 dark:text-red-400" },
];

export function DecisoesView({ rows, canReset = false }: { rows: any[]; canReset?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState("Validada");
  const [resetBusy, setResetBusy] = useState(false);
  async function resetar(ids: number[], label: string) {
    if (!ids.length) return;
    if (!confirm(`Admin: ${label}?\nVolta a decisão para "Pendente" (fica registrado na auditoria).`)) return;
    setResetBusy(true);
    try {
      const r = await fetch("/api/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oportunidade_ids: ids, tipo: "decisao" }) });
      if (r.ok) router.refresh();
      else { const j = await r.json().catch(() => ({})); alert(j.error || "Falhou."); }
    } catch { alert("Erro de rede."); } finally { setResetBusy(false); }
  }
  const [q, setQ] = useState("");
  const count = (k: string) => rows.filter((r) => r.status_validacao === k).length;
  const nq = semAcento(q);
  const lista = useMemo(() => rows.filter((r) => r.status_validacao === tab && (!nq || semAcento(`${r.orgao_padronizado} ${r.nome_orgao} ${r.categoria_principal} ${r.decidido_por}`).includes(nq))), [rows, tab, nq]);
  const fmtDT = (d: any) => { try { return d ? new Date(d).toLocaleString("pt-BR") : "—"; } catch { return "—"; } };
  const ativa = TABS.find((t) => t.key === tab);

  return (
    <div className="space-y-3">
      {/* destinos — um cartão por decisão */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setQ(""); }}
            className={"text-left rounded-xl border p-3 transition " + (tab === t.key ? "border-brand bg-brand/5 shadow-soft" : "border-line bg-surface hover:bg-surface2")}>
            <div className="flex items-center gap-1.5">
              <span className={"w-2.5 h-2.5 rounded-full " + t.dot} />
              <span className={"font-bold text-sm " + t.cls}>{t.label}</span>
              <span className="ml-auto text-xl font-extrabold text-fg">{count(t.key)}</span>
            </div>
            <div className="text-xs text-muted mt-0.5">{t.sub}</div>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar nesta lista (órgão, solução, quem decidiu)…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-line bg-surface text-fg text-sm" />
      </div>
      {canReset && lista.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500/5 border border-amber-500/30 rounded-lg px-3 py-2">
          <span className="text-xs text-amber-700 dark:text-amber-400">⚡ Admin: você pode resetar decisões (volta p/ “Pendente”; fica na auditoria).</span>
          <button disabled={resetBusy} onClick={() => resetar(lista.map((o) => o.id).filter(Boolean), `resetar TODAS as ${lista.length} de "${ativa?.label}"`)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/10 disabled:opacity-50"><RotateCcw size={13} /> {resetBusy ? "…" : `Resetar todas (${lista.length})`}</button>
        </div>
      )}

      {lista.length === 0 ? (
        <Empty>Nenhuma oportunidade em “{ativa?.label}”. As decisões que você tomar na Lista de Ataque aparecem aqui.</Empty>
      ) : (
        <Table head={["Órgão", "UF", "Solução", "Valor", "Vence", "Decidido por", "Quando", ""]}>
          {lista.map((o) => (
            <tr key={o.id} onClick={() => o.id && router.push(`/oportunidades/${o.id}`)} className="border-b border-line last:border-0 hover:bg-surface2 cursor-pointer transition">
              <td className="px-3 py-2 font-semibold max-w-[220px] truncate">{o.orgao_padronizado || o.nome_orgao || "—"}</td>
              <td className="px-3 py-2">{o.uf}</td>
              <td className="px-3 py-2 text-muted max-w-[180px] truncate">{o.categoria_principal || "—"}</td>
              <td className="px-3 py-2 font-semibold whitespace-nowrap">{brl(o.valor_total)}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted">{typeof o.dias_ate_vencimento === "number" ? `${o.dias_ate_vencimento}d` : fmtDate(o.fim_vigencia)}</td>
              <td className="px-3 py-2 text-fg">{o.decidido_por || "—"}</td>
              <td className="px-3 py-2 text-muted text-xs whitespace-nowrap">{fmtDT(o.decidido_em)}</td>
              <td className="px-3 py-2 text-muted whitespace-nowrap text-right">
                {canReset && <button onClick={(e) => { e.stopPropagation(); resetar([o.id], "resetar a decisão deste contrato"); }} title="Resetar decisão (admin)" className="inline-flex items-center mr-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 align-middle"><RotateCcw size={14} /></button>}
                <ChevronRight size={16} className="inline align-middle" />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
