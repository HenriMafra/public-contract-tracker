"use client";
import { useState } from "react";
import { Card, CardPad, Badge, Empty } from "@/components/ui/primitives";
import { brl, fmtDate, cn } from "@/lib/utils/format";
import { ChevronRight, Loader2, Building2, ExternalLink, Search, Eraser } from "lucide-react";
import { MarcarConcorrente } from "@/components/fornecedores/MarcarConcorrente";

const cor = (g: string) => g === "Alto" ? "bg-red-500/15 text-red-600 dark:text-red-400" : g === "Médio" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

export function FornecedoresView({ fornecedores, canMark = false }: { fornecedores: any[]; canMark?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [det, setDet] = useState<Record<string, any>>({});
  const [openOrg, setOpenOrg] = useState<Set<string>>(new Set());
  const [orgQuery, setOrgQuery] = useState("");
  function toggleOrg(key: string) { setOpenOrg((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; }); }

  // Chave ÚNICA por fornecedor = CNPJ (a view não tem id; por isso antes "abria todos").
  async function toggle(f: any, i: number) {
    const k = String(f.cnpj_fornecedor || f.nome_fornecedor || i);
    if (open === k) { setOpen(null); return; }
    setOpen(k); setOrgQuery("");
    if (!det[k]) {
      setDet((d) => ({ ...d, [k]: { loading: true } }));
      try {
        const r = await fetch(`/api/fornecedor?cnpj=${encodeURIComponent(f.cnpj_fornecedor || "")}`);
        const j = await r.json();
        setDet((d) => ({ ...d, [k]: { loading: false, orgaos: j.orgaos || [] } }));
      } catch { setDet((d) => ({ ...d, [k]: { loading: false, orgaos: [], erro: true } })); }
    }
  }

  const nq = q.trim().toLowerCase();
  const lista = nq ? fornecedores.filter((f) => (f.nome_fornecedor || "").toLowerCase().includes(nq) || (f.cnpj_fornecedor || "").includes(nq)) : fornecedores;

  if (!fornecedores.length) return <Empty>Sem fornecedores nesta visão.</Empty>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar fornecedor por nome ou CNPJ…"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-line bg-surface text-fg text-sm" />
        </div>
        {q && <button onClick={() => setQ("")} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition shrink-0"><Eraser size={13} /> Limpar</button>}
      </div>
      <div className="text-xs text-muted">Legenda: <span className="text-fg">★</span> = concorrente conhecido · etiqueta colorida = <b>grau de ameaça</b> (Alto / Médio / Baixo).</div>

      <div className="space-y-2">
        {lista.map((f: any, i: number) => {
          const k = String(f.cnpj_fornecedor || f.nome_fornecedor || i);
          const aberto = open === k;
          const d = det[k];
          return (
            <Card key={k}>
              <button onClick={() => toggle(f, i)} className="w-full text-left p-3.5 flex items-center gap-3 hover:bg-surface2 transition rounded-xl">
                <ChevronRight size={16} className={cn("text-muted transition shrink-0", aberto && "rotate-90")} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-fg truncate">{f.nome_fornecedor} {f.concorrente_conhecido ? <span title="concorrente conhecido">★</span> : ""}</div>
                  <div className="text-xs text-muted">{f.cnpj_fornecedor || "—"} · {f.categorias_detectadas || "—"}</div>
                </div>
                {f.grau_ameaca && <span title={`grau de ameaça: ${f.grau_ameaca}`}><Badge className={cor(f.grau_ameaca)}>{f.grau_ameaca}</Badge></span>}
                <div className="text-right shrink-0">
                  <div className="font-semibold text-fg text-sm">{brl(f.valor_total_mapeado)}</div>
                  <div className="text-xs text-muted">{f.total_contratos ?? 0} contrato(s)</div>
                </div>
              </button>

              {aberto && (
                <div className="px-3.5 pb-3.5 border-t border-line pt-3">
                  {canMark && (
                    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-line">
                      <span className="text-xs text-muted">{f.concorrente_conhecido ? "★ Já é concorrente conhecido" : "Ainda não marcado como concorrente"}</span>
                      <MarcarConcorrente cnpj={f.cnpj_fornecedor || ""} nome={f.nome_fornecedor} />
                    </div>
                  )}
                  {d?.loading ? <div className="text-sm text-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> carregando contratos…</div> :
                    d?.erro ? <div className="text-sm text-red-600">Falha ao carregar.</div> :
                      !d?.orgaos?.length ? <Empty>Sem contratos visíveis para você deste fornecedor.</Empty> : (
                        <div className="space-y-2">
                          {d.orgaos.length > 6 && (
                            <div className="relative">
                              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                              <input value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} placeholder={`buscar entre ${d.orgaos.length} órgãos…`} className="w-full h-8 pl-8 pr-3 rounded-lg border border-line bg-surface text-fg text-sm" />
                            </div>
                          )}
                          {d.orgaos.filter((o: any) => !orgQuery.trim() || String(o.orgao || "").toLowerCase().includes(orgQuery.trim().toLowerCase())).map((o: any, i: number) => {
                            const orgKey = `${k}::${o.orgao || i}`;
                            const orgAberto = openOrg.has(orgKey);
                            return (
                            <div key={orgKey} className="rounded-lg border border-line overflow-hidden">
                              <button onClick={() => toggleOrg(orgKey)} className="w-full flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 bg-surface2/40 hover:bg-surface2 transition text-left">
                                <ChevronRight size={14} className={cn("text-muted shrink-0 transition", orgAberto && "rotate-90")} />
                                <Building2 size={13} className="text-brand shrink-0" /> <span className="truncate">{o.orgao}</span>
                                <span className="text-xs text-muted font-normal whitespace-nowrap ml-auto">{o.uf ? `(${o.uf}) · ` : ""}{o.contratos.length} contrato(s)</span>
                              </button>
                              {orgAberto && (
                              <div className="divide-y divide-line border-t border-line">
                                {o.contratos.map((c: any) => (
                                  <div key={c.id} className="px-3 py-2 text-sm flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-fg truncate">{c.objeto || c.categoria || "Contrato"} {c.numero ? <span className="text-muted">· nº {c.numero}</span> : null}</div>
                                      <div className="text-xs text-muted">{c.categoria || "—"}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="font-semibold text-fg text-xs">{brl(c.valor)}</div>
                                      <div className={cn("text-xs", typeof c.dias === "number" && c.dias < 0 ? "text-red-500" : typeof c.dias === "number" && c.dias <= 30 ? "text-amber-500" : "text-muted")}>
                                        {typeof c.dias === "number" ? (c.dias < 0 ? `venceu há ${Math.abs(c.dias)}d` : `vence em ${c.dias}d`) : fmtDate(c.fim)}
                                      </div>
                                    </div>
                                    {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="text-brand shrink-0" title="Abrir no PNCP"><ExternalLink size={14} /></a>}
                                  </div>
                                ))}
                              </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
