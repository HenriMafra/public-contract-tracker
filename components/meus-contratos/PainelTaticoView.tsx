"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Input } from "@/components/ui/primitives";
import { brl, fmtDate, cn } from "@/lib/utils/format";
import { Target, Briefcase, Handshake, CheckCircle2, XCircle, Search } from "lucide-react";

const STAGES: { key: string; label: string; icon: any; tone: string }[] = [
  { key: "Em prospecção", label: "Prospectando", icon: Target, tone: "text-brand" },
  { key: "Em análise", label: "Em análise", icon: Search, tone: "text-amber-500" },
  { key: "Em negociação", label: "Negociando", icon: Handshake, tone: "text-indigo-500" },
  { key: "Fechado", label: "Fechados (ganhos)", icon: CheckCircle2, tone: "text-emerald-500" },
  { key: "Perdido", label: "Perdidos", icon: XCircle, tone: "text-red-500" },
  { key: "Descartado", label: "Descartados", icon: XCircle, tone: "text-muted" },
  { key: "Novo", label: "Sem andamento definido", icon: Briefcase, tone: "text-muted" },
];

function norm(s: any) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function diasChip(d: any) {
  if (typeof d !== "number") return null;
  const tone = d < 0 ? "bg-red-500/15 text-red-600 dark:text-red-400" : d <= 30 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold", tone)}>{d < 0 ? `venceu há ${Math.abs(d)}d` : `vence em ${d}d`}</span>;
}

/** Painel Tático: contratos que o próprio usuário já ASSUMIU (não é a base geral) —
 * busca aqui serve pra achar um contrato específico dentro do que a pessoa já pegou,
 * útil quando o funil pessoal cresce e fica longo. */
export function PainelTaticoView({ rows }: { rows: any[] }) {
  const [q, setQ] = useState("");
  const nq = norm(q);

  const filtradas = useMemo(() => {
    if (!nq) return rows;
    return rows.filter((r) => norm(`${r.orgao_padronizado} ${r.nome_orgao} ${r.categoria_principal} ${r.objeto_original} ${r.uf}`).includes(nq));
  }, [rows, nq]);

  const grupos = STAGES.map((st) => ({ ...st, items: filtradas.filter((r) => (r.status_comercial || "Novo") === st.key) })).filter((g) => g.items.length > 0);

  return (
    <>
      {rows.length > 6 && (
        <div className="relative mb-4 max-w-md">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar órgão, objeto, solução…" className="pl-8" />
        </div>
      )}
      <div className="space-y-5">
        {grupos.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={g.tone} />
                <h2 className="font-bold text-fg">{g.label}</h2>
                <span className="text-xs text-muted">({g.items.length})</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((o: any) => (
                  <Link key={o.id || o.id_oportunidade} href={`/oportunidades/${o.id ?? o.id_oportunidade}`}
                    className="block rounded-xl border border-line bg-surface p-3.5 shadow-soft hover:bg-surface2 hover:shadow-md transition">
                    <div className="font-bold text-fg text-sm truncate">{o.orgao_padronizado || o.nome_orgao || "—"}</div>
                    <div className="text-xs text-muted">{[o.uf, o.categoria_principal].filter(Boolean).join(" · ")}</div>
                    {o.objeto_original && <p className="text-xs text-muted line-clamp-2 leading-snug mt-1.5">{o.objeto_original}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-semibold text-fg text-sm">{brl(o.valor_total)}</span>
                      {diasChip(o.dias_ate_vencimento)}
                    </div>
                    {o.status_validacao && o.status_validacao !== "Pendente" && (
                      <div className="mt-2"><Badge>{o.status_validacao}</Badge></div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {filtradas.length === 0 && <p className="text-sm text-muted">Nenhum contrato seu corresponde a essa busca.</p>}
      </div>
    </>
  );
}
