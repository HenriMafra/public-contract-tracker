"use client";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Badge, Empty } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { ScrollboxTop } from "@/components/ui/ScrollboxTop";
import { brl, corUrgencia } from "@/lib/utils/format";
import type { Col } from "@/lib/utils/export";

const COLS: Col[] = [
  { key: "orgao_padronizado", label: "Órgão" }, { key: "uf", label: "UF" },
  { key: "categoria_principal", label: "Solução" }, { key: "valor_total", label: "Valor (R$)" },
  { key: "urgencia_comercial", label: "Urgência" }, { key: "score_comercial", label: "Score" }, { key: "id_oportunidade", label: "ID" },
];

export function Top10Table({ rows }: { rows: any[] }) {
  const router = useRouter();
  if (!rows?.length) return <Empty>Sem oportunidades nesta rodada.</Empty>;
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ExportButtons rows={rows} columns={COLS} filename="atlas_top10" /></div>
      <ScrollboxTop boxClass="rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="sticky z-20" style={{ top: 0 }}><tr className="text-left text-xs uppercase tracking-wider text-muted font-semibold bg-surface2 border-b border-line">
            <th className="px-3 py-2.5">Órgão</th><th className="px-3 py-2.5">Solução</th>
            <th className="px-3 py-2.5 text-right">Valor</th><th className="px-3 py-2.5">Urgência</th>
            <th className="px-3 py-2.5">Score</th><th className="px-3 py-2.5"></th>
          </tr></thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={i} onClick={() => (o.id ?? o.id_oportunidade) && router.push(`/oportunidades/${o.id ?? o.id_oportunidade}`)}
                className="border-b border-line last:border-0 hover:bg-surface2 cursor-pointer transition">
                <td className="px-3 py-2.5"><div className="font-semibold text-fg truncate max-w-[220px]">{o.orgao_padronizado || "—"}</div><div className="text-xs text-muted">{o.uf}</div></td>
                <td className="px-3 py-2.5 text-muted truncate max-w-[160px]">{o.categoria_principal || "—"}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-fg whitespace-nowrap">{brl(o.valor_total)}</td>
                <td className="px-3 py-2.5"><Badge className={corUrgencia(o.urgencia_comercial)}>{o.urgencia_comercial || "—"}</Badge></td>
                <td className="px-3 py-2.5 font-bold text-fg">{o.score_comercial ?? "—"}</td>
                <td className="px-3 py-2.5 text-muted"><ChevronRight size={15} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollboxTop>
    </div>
  );
}
