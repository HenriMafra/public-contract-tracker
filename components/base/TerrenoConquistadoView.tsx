"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { Input } from "@/components/ui/primitives";
import { brl, fmtDate, cn } from "@/lib/utils/format";
import { AlertTriangle, ShieldCheck, XCircle, ChevronDown, Cpu, Search } from "lucide-react";

function norm(s: any) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function diasChip(d: any) {
  if (typeof d !== "number") return null;
  const tone = d < 0 ? "bg-red-500/15 text-red-600 dark:text-red-400" : d <= 180 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-semibold", tone)}>{d < 0 ? `venceu há ${Math.abs(d)}d` : `vence em ${d}d`}</span>;
}

function Bloco({ titulo, icon, tone, itens, open = true }: { titulo: string; icon: any; tone: string; itens: any[]; open?: boolean }) {
  const Icon = icon;
  if (!itens.length) return null;
  return (
    <details open={open}>
      <summary className="flex items-center gap-2 mb-2 cursor-pointer select-none list-none">
        <Icon size={16} className={tone} />
        <h2 className="font-bold text-fg">{titulo}</h2>
        <span className="text-xs text-muted">({itens.length})</span>
        <ChevronDown size={16} className="chev text-muted ml-1" />
      </summary>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {itens.map((o: any) => (
          <Link key={o.id || o.id_oportunidade} href={`/oportunidades/${o.id ?? o.id_oportunidade}`}
            className="block rounded-xl border border-line bg-surface p-3.5 shadow-soft hover:bg-surface2 hover:shadow-md transition">
            <div className="font-bold text-fg text-sm truncate">{o.orgao_padronizado || o.nome_orgao || "—"}</div>
            <div className="text-xs text-muted">{[o.uf, o.categoria_principal].filter(Boolean).join(" · ")}</div>
            {o.objeto_original && <p className="text-xs text-muted line-clamp-2 leading-snug mt-1.5">{o.objeto_original}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-semibold text-fg text-sm">{brl(o.valor_total)}</span>
              {diasChip(o.dias_ate_vencimento)}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">fim: {fmtDate(o.fim_vigencia)}</span>
              {o.fabricante && <Badge tone="navy" className="shrink-0"><Cpu size={11} /> {o.fabricante}</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </details>
  );
}

/** Terreno Conquistado: TODOS os contratos já encontrados onde a ENTERPRISECORE é fornecedora —
 * vencidos, a vencer e vigentes, com busca livre por órgão/objeto/solução. */
export function TerrenoConquistadoView({ rows, checkpoint }: { rows: any[]; checkpoint: any[] }) {
  const [q, setQ] = useState("");
  const nq = norm(q);

  const filtradas = useMemo(() => {
    if (!nq) return rows;
    return rows.filter((r) => norm(`${r.orgao_padronizado} ${r.nome_orgao} ${r.categoria_principal} ${r.subcategoria} ${r.objeto_original} ${r.uf} ${r.municipio}`).includes(nq));
  }, [rows, nq]);

  const aVencer = filtradas.filter((r) => typeof r.dias_ate_vencimento === "number" && r.dias_ate_vencimento >= 0 && r.dias_ate_vencimento <= 180);
  const vigentes = filtradas.filter((r) => typeof r.dias_ate_vencimento === "number" && r.dias_ate_vencimento > 180);
  const vencidos = filtradas.filter((r) => typeof r.dias_ate_vencimento === "number" && r.dias_ate_vencimento < 0);
  const checkpointFiltrado = nq ? checkpoint.filter((r) => norm(`${r.orgao_padronizado} ${r.nome_orgao} ${r.objeto_original}`).includes(nq)) : checkpoint;

  return (
    <>
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar órgão, objeto, solução…" className="pl-8" />
      </div>
      <div className="space-y-5">
        <Bloco titulo="A vencer — priorize a renovação" icon={AlertTriangle} tone="text-amber-500" itens={aVencer} />
        <Bloco titulo="Vigentes" icon={ShieldCheck} tone="text-emerald-500" itens={vigentes} />
        <Bloco titulo="Já vencidos" icon={XCircle} tone="text-red-500" itens={vencidos} />
        <Bloco titulo="Com Check Point (fabricante)" icon={Cpu} tone="text-blue-500" itens={checkpointFiltrado} open={false} />
      </div>
    </>
  );
}
