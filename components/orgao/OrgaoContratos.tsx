"use client";
import { useMemo, useState } from "react";
import { Table, Badge, Input, Select, Empty } from "@/components/ui/primitives";
import { NomeFornecedor } from "@/components/ui/NomeFornecedor";
import { brl, fmtDate } from "@/lib/utils/format";
import { Search, Cpu, ChevronLeft, ChevronRight } from "lucide-react";

const PER = 10;

/** Contratos do órgão com busca + filtro por fabricante + paginação (10/página). */
export function OrgaoContratos({ contratos }: { contratos: any[] }) {
  const [q, setQ] = useState("");
  const [fab, setFab] = useState("");
  const [page, setPage] = useState(0);

  const fabricantes = useMemo(() => Array.from(new Set(contratos.map((c) => c.fabricante).filter(Boolean))).sort(), [contratos]);
  const filt = useMemo(() => {
    const nq = q.trim().toLowerCase();
    return contratos.filter((c) => {
      if (fab && c.fabricante !== fab) return false;
      if (!nq) return true;
      return [c.objeto_original, c.nome_fornecedor, c.categoria_principal, c.fabricante, c.numero_contrato]
        .some((v) => String(v || "").toLowerCase().includes(nq));
    });
  }, [q, fab, contratos]);

  const pages = Math.max(1, Math.ceil(filt.length / PER));
  const cur = Math.min(page, pages - 1);
  const slice = filt.slice(cur * PER, cur * PER + PER);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e: any) => { setQ(e.target.value); setPage(0); }} placeholder="buscar por objeto, fornecedor, fabricante…" className="pl-8 h-9" />
        </div>
        {fabricantes.length > 0 && (
          <Select value={fab} onChange={(e: any) => { setFab(e.target.value); setPage(0); }} className="h-9 w-auto min-w-[160px]">
            <option value="">Todos os fabricantes</option>
            {fabricantes.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        )}
        <span className="text-xs text-muted whitespace-nowrap">{filt.length} contrato(s)</span>
      </div>

      {filt.length === 0 ? <Empty>Nenhum contrato com esse filtro.</Empty> : (
        <>
          <Table head={["Nº", "Objeto", "Categoria", "Fabricante", "Fornecedor", "Valor", "Término", "Status"]}>
            {slice.map((c: any) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface2 transition">
                <td className="px-3 py-1.5 whitespace-nowrap">{c.numero_contrato}</td>
                <td className="px-3 py-1.5 max-w-[280px] truncate" title={c.objeto_original || ""}>
                  {c.link_fonte ? <a href={c.link_fonte} target="_blank" rel="noreferrer" className="text-brand hover:underline">{c.objeto_original || "abrir ↗"}</a> : (c.objeto_original || "—")}
                </td>
                <td className="px-3 py-1.5">{c.categoria_principal}</td>
                <td className="px-3 py-1.5">{c.fabricante ? <Badge tone="navy"><Cpu size={11} /> {c.fabricante}</Badge> : <span className="text-muted">—</span>}</td>
                <td className="px-3 py-1.5 max-w-[200px] truncate" title={c.nome_fornecedor || ""}><NomeFornecedor name={c.nome_fornecedor} /></td>
                <td className="px-3 py-1.5 font-semibold whitespace-nowrap">{brl(c.valor_total)}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(c.fim_vigencia)}</td>
                <td className="px-3 py-1.5">{c.status_contrato}</td>
              </tr>
            ))}
          </Table>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button disabled={cur === 0} onClick={() => setPage(cur - 1)}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-line bg-surface text-fg text-xs font-semibold hover:bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={14} /> anterior
              </button>
              <span className="text-xs text-muted">página <b className="text-fg">{cur + 1}</b> de {pages}</span>
              <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-line bg-surface text-fg text-xs font-semibold hover:bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed">
                próxima <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
