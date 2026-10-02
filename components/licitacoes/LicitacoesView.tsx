"use client";
import { Fragment, useMemo, useState, useEffect } from "react";
import { Badge, Empty, Select, Input } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { ScrollboxTop } from "@/components/ui/ScrollboxTop";
import { Paginator } from "@/components/ui/Paginator";
import { Combobox } from "@/components/ui/Combobox";
import { brl, fmtDate, cn } from "@/lib/utils/format";
import { Search, ExternalLink, Clock, ChevronDown, Eraser, Star } from "lucide-react";
import type { Col } from "@/lib/utils/export";

const norm = (s: any) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const uniq = (xs: any[]) => Array.from(new Set(xs.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const EXPORT_COLS: Col[] = [
  { key: "orgao_nome", label: "Órgão" }, { key: "uf", label: "UF" }, { key: "municipio", label: "Município" },
  { key: "objeto", label: "Objeto" }, { key: "categoria", label: "Categoria" }, { key: "modalidade", label: "Modalidade" },
  { key: "valor_estimado", label: "Valor estimado (R$)" }, { key: "situacao", label: "Situação" },
  { key: "encerramento_proposta", label: "Encerra proposta" }, { key: "link", label: "Link" },
];

function prazo(enc?: string) {
  if (!enc) return { txt: "—", dias: null as number | null };
  const d = new Date(enc); if (isNaN(d.getTime())) return { txt: "—", dias: null };
  const dias = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const data = d.toLocaleDateString("pt-BR");
  if (dias < 0) return { txt: `encerrado (${data})`, dias };
  if (dias === 0) return { txt: `hoje (${data})`, dias };
  return { txt: `${dias}d (${data})`, dias };
}

export function LicitacoesView({ linhas, focoOrgaos = [], escopoUfs = [] }: { linhas: any[]; focoOrgaos?: string[]; escopoUfs?: string[] }) {
  const focoNorm = useMemo(() => (focoOrgaos || []).map(norm).filter(Boolean), [focoOrgaos]);
  const temFoco = focoNorm.length > 0;
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [cat, setCat] = useState("");
  const [soAbertas, setSoAbertas] = useState(false); // mostra TODAS por padrão (abertas são poucas; o resto é histórico de inteligência)
  const [soSrp, setSoSrp] = useState(false);
  const [soMeus, setSoMeus] = useState(false); // "Meus órgãos": filtra editais cujo órgão bate com os seus órgãos de foco
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");
  const [aberta, setAberta] = useState<number | null>(null);
  const PER = 50;
  const [page, setPage] = useState(1);

  const opts = useMemo(() => ({
    uf: uniq(linhas.map((l) => l.uf)),
    cat: uniq(linhas.map((l) => l.categoria)),
    anos: Array.from(new Set(linhas.map((l) => (l.encerramento_proposta ? new Date(l.encerramento_proposta).getFullYear() : null)).filter(Boolean))).sort((a: any, b: any) => b - a),
  }), [linhas]);

  const filtradas = useMemo(() => {
    const nq = norm(q);
    return linhas.filter((l) => {
      if (soMeus && temFoco) { const on = norm(l.orgao_nome); if (!focoNorm.some((fn) => on.includes(fn) || fn.includes(on))) return false; }
      if (soAbertas && !l.proposta_aberta) return false;
      if (soSrp && !l.srp) return false;
      if (uf && l.uf !== uf) return false;
      if (cat && l.categoria !== cat) return false;
      if (ano || mes) {
        const dt = l.encerramento_proposta ? new Date(l.encerramento_proposta) : null;
        if (!dt || isNaN(dt.getTime())) return false;
        if (ano && String(dt.getFullYear()) !== ano) return false;
        if (mes && String(dt.getMonth() + 1) !== mes) return false;
      }
      if (nq && !norm(`${l.orgao_nome} ${l.unidade} ${l.objeto} ${l.categoria} ${l.modalidade} ${l.municipio}`).includes(nq)) return false;
      return true;
    });
  }, [linhas, q, uf, cat, soAbertas, soSrp, soMeus, ano, mes]);
  useEffect(() => { setPage(1); }, [q, uf, cat, soAbertas, soSrp, soMeus, ano, mes]);
  const pageRows = useMemo(() => filtradas.slice((page - 1) * PER, page * PER), [filtradas, page]);

  const abertas = linhas.filter((l) => l.proposta_aberta).length;

  return (
    <div className="space-y-3">
      <div className="bg-surface border border-line rounded-xl p-3 shadow-soft">
        {(escopoUfs.length > 0 || temFoco) && (
          <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-line">
            {escopoUfs.length > 0 && <span className="text-xs text-muted">Sua área: <b className="text-fg">{escopoUfs.join(", ")}</b></span>}
            {temFoco && (
              <button onClick={() => setSoMeus((v) => !v)} className={cn("inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-xs font-semibold transition", soMeus ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:bg-surface2")}>
                <Star size={12} /> {soMeus ? "Mostrando: meus órgãos" : "Filtrar pelos meus órgãos"}
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <div className="md:col-span-5 relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar órgão, objeto, modalidade…" className="pl-8" />
          </div>
          <Select className="md:col-span-2" value={uf} onChange={(e: any) => setUf(e.target.value)}><option value="">Todas as UFs</option>{opts.uf.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
          <Combobox className="md:col-span-3" value={cat} onChange={setCat} options={opts.cat} allLabel="Categoria (todas)" />
          <div className="md:col-span-2 flex flex-col gap-1 text-sm text-fg">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={soAbertas} onChange={(e) => setSoAbertas(e.target.checked)} className="h-4 w-4 accent-brand" /> só abertas</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={soSrp} onChange={(e) => setSoSrp(e.target.checked)} className="h-4 w-4 accent-brand" /> registro de preços</label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-muted font-semibold">Encerramento da proposta:</span>
          <Select className="h-8 w-auto" value={ano} onChange={(e: any) => setAno(e.target.value)}><option value="">Ano (todos)</option>{opts.anos.map((a: any) => <option key={a} value={String(a)}>{a}</option>)}</Select>
          <Select className="h-8 w-auto" value={mes} onChange={(e: any) => setMes(e.target.value)}><option value="">Mês (todos)</option>{MESES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}</Select>
          <button onClick={() => { setAno(""); setMes(""); setUf(""); setCat(""); setQ(""); setSoAbertas(false); setSoSrp(false); setSoMeus(false); }} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition"><Eraser size={13} /> Limpar filtros</button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-muted"><b className="text-fg">{filtradas.length}</b> licitações · <span className="text-green-600 dark:text-green-400 font-semibold">{abertas}</span> com proposta aberta</div>
          <ExportButtons rows={filtradas} columns={EXPORT_COLS} filename="mapper_licitacoes" />
        </div>
      </div>

      {filtradas.length === 0 ? (
        <Empty>Nenhuma licitação com esses filtros. {linhas.length === 0 ? "A coleta de editais ainda não rodou." : "Tente limpar os filtros."}</Empty>
      ) : (
        <>
        <ScrollboxTop>
          <table className="w-full text-sm">
            <thead className="sticky z-20" style={{ top: 0 }}>
              <tr className="text-left text-xs uppercase tracking-wide text-muted font-bold bg-surface2 border-b-2 border-line shadow-[0_4px_6px_-3px_rgba(0,0,0,0.22)]">
                <th className="px-3 py-3.5">Órgão</th><th className="px-3 py-3 max-w-[340px]">Objeto</th>
                <th className="px-3 py-3">Categoria</th><th className="px-3 py-3 whitespace-nowrap">Modalidade</th>
                <th className="px-3 py-3 text-right">Valor est.</th><th className="px-3 py-3 whitespace-nowrap">Prazo proposta</th><th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((o, i) => {
                const pz = prazo(o.encerramento_proposta);
                const rid = o.id ?? i; const exp = aberta === rid;
                return (
                  <Fragment key={rid}>
                    <tr onClick={() => setAberta(exp ? null : rid)} className="border-b border-line hover:bg-surface2 transition cursor-pointer">
                      <td className="px-3 py-2.5"><div className="font-semibold text-fg max-w-[200px] truncate" title={o.orgao_nome}>{o.orgao_nome || "—"}</div><div className="text-xs text-muted">{[o.municipio, o.uf].filter(Boolean).join(" · ")}</div></td>
                      <td className="px-3 py-2.5 max-w-[340px]"><div className="text-fg truncate" title={o.objeto}>{o.objeto || "—"}</div>{o.srp ? <span className="text-xs text-brand font-semibold">SRP (registro de preços)</span> : null}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><Badge tone="navy">{o.categoria || "—"}</Badge></td>
                      <td className="px-3 py-2.5 text-muted text-xs whitespace-nowrap">{o.modalidade || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-fg whitespace-nowrap">{o.valor_estimado ? brl(o.valor_estimado) : "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {pz.dias != null && pz.dias < 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400" title={pz.txt}>ENCERRADA</span>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold",
                            pz.dias == null ? "text-muted" : pz.dias <= 3 ? "text-red-500" : pz.dias <= 7 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400")}>
                            <Clock size={12} /> {pz.txt}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted"><ChevronDown size={16} className={cn("transition-transform", exp && "rotate-180")} /></td>
                    </tr>
                    {exp && (
                      <tr className="bg-surface2/40 border-b border-line">
                        <td colSpan={7} className="px-4 py-3.5">
                          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">Objeto completo</div>
                          <p className="text-sm text-fg leading-relaxed mb-3">{o.objeto || "—"}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-sm">
                            <div><div className="text-xs text-muted">Órgão</div><div className="text-fg font-medium">{o.orgao_nome || "—"}</div>{o.unidade ? <div className="text-xs text-muted">{o.unidade}</div> : null}</div>
                            <div><div className="text-xs text-muted">Modalidade</div><div className="text-fg">{o.modalidade || "—"}</div></div>
                            <div><div className="text-xs text-muted">Situação</div><div className="text-fg">{o.situacao || "—"}{o.proposta_aberta ? " · aberta" : ""}</div></div>
                            <div><div className="text-xs text-muted">Valor estimado</div><div className="text-fg font-semibold">{o.valor_estimado ? brl(o.valor_estimado) : "—"}</div></div>
                            <div><div className="text-xs text-muted">Abertura proposta</div><div className="text-fg">{o.abertura_proposta ? new Date(o.abertura_proposta).toLocaleString("pt-BR") : "—"}</div></div>
                            <div><div className="text-xs text-muted">Encerramento</div><div className="text-fg">{o.encerramento_proposta ? new Date(o.encerramento_proposta).toLocaleString("pt-BR") : "—"}</div></div>
                            <div><div className="text-xs text-muted">Publicado</div><div className="text-fg">{fmtDate(o.data_publicacao)}</div></div>
                            <div><div className="text-xs text-muted">UF / Município</div><div className="text-fg">{[o.municipio, o.uf].filter(Boolean).join(" · ") || "—"}</div></div>
                          </div>
                          {o.link && <a href={o.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 mt-3 text-brand font-semibold hover:underline">Abrir no portal de origem <ExternalLink size={13} /></a>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ScrollboxTop>
        <Paginator page={page} setPage={setPage} total={filtradas.length} perPage={PER} />
        </>
      )}
    </div>
  );
}
