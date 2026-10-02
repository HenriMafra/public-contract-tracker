"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Badge, Select, Input, Empty } from "@/components/ui/primitives";
import { brl } from "@/lib/utils/format";
import { ChevronRight, Search, AlertTriangle, Eraser } from "lucide-react";

const norm = (s: any) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const uniq = (xs: any[]) => Array.from(new Set(xs.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

/** Qualidade da base, COM filtros (precisa revisão / UF / status / busca). Linha clicável. */
export function QualidadeTable({ itens }: { itens: any[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [rev, setRev] = useState(""); // "" todos · "sim" só precisa · "nao" já ok
  const [status, setStatus] = useState("");

  const opts = useMemo(() => ({ uf: uniq(itens.map((i) => i.uf)), status: uniq(itens.map((i) => i.status_validacao)) }), [itens]);
  const precisam = useMemo(() => itens.filter((o) => o.necessita_revisao).length, [itens]);

  const filtradas = useMemo(() => {
    const nq = norm(q);
    return itens.filter((o) =>
      (!uf || o.uf === uf) &&
      (rev === "" || (rev === "sim" ? !!o.necessita_revisao : !o.necessita_revisao)) &&
      (!status || o.status_validacao === status) &&
      (!nq || norm(`${o.orgao} ${o.categoria_principal} ${o.id_oportunidade}`).includes(nq))
    );
  }, [itens, q, uf, rev, status]);

  const ativos = q || uf || rev || status;

  return (
    <div className="space-y-3">
      <div className="bg-surface border border-line rounded-xl p-3 shadow-soft space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-5 relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar órgão, categoria, ID…" className="pl-8" />
          </div>
          <Select className="md:col-span-2" value={uf} onChange={(e: any) => setUf(e.target.value)}><option value="">Todas as UFs</option>{opts.uf.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
          <Select className="md:col-span-3" value={rev} onChange={(e: any) => setRev(e.target.value)}>
            <option value="">Revisão: todos</option>
            <option value="sim">só os que precisam de revisão</option>
            <option value="nao">já conferidos (não precisam)</option>
          </Select>
          <Select className="md:col-span-2" value={status} onChange={(e: any) => setStatus(e.target.value)}><option value="">Todas decisões</option>{opts.status.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={() => setRev(rev === "sim" ? "" : "sim")}
            className={"inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition " + (rev === "sim" ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold" : "border-line bg-surface text-muted hover:text-fg")}>
            <AlertTriangle size={12} /> {precisam} precisam de revisão
          </button>
          <span className="text-muted"><b className="text-fg">{filtradas.length}</b> de {itens.length} item(ns){ativos ? " (filtrado)" : ""}</span>
          <button onClick={() => { setQ(""); setUf(""); setRev(""); setStatus(""); }} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition"><Eraser size={13} /> Limpar filtros</button>
        </div>
      </div>

      {filtradas.length === 0 ? <Empty>Nenhum item com esses filtros.</Empty> : (
        <Table head={["ID", "Órgão", "UF", "Categoria", "Valor", "Necessita revisão", "Decisão", ""]}>
          {filtradas.map((o: any, i: number) => (
            <tr key={i}
              onClick={() => (o.id ?? o.id_oportunidade) && router.push(`/oportunidades/${o.id ?? o.id_oportunidade}`)}
              className="border-b border-line last:border-0 hover:bg-surface2 cursor-pointer transition">
              <td className="px-3 py-2 font-mono text-xs">{o.id_oportunidade}</td>
              <td className="px-3 py-2 font-semibold">{o.orgao}</td>
              <td className="px-3 py-2">{o.uf}</td>
              <td className="px-3 py-2 text-muted">{o.categoria_principal}</td>
              <td className="px-3 py-2 font-semibold whitespace-nowrap">{brl(o.valor_total)}</td>
              <td className="px-3 py-2">{o.necessita_revisao ? <Badge tone="red">Sim</Badge> : "—"}</td>
              <td className="px-3 py-2"><Badge>{o.status_validacao}</Badge></td>
              <td className="px-3 py-2 text-muted"><ChevronRight size={16} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
