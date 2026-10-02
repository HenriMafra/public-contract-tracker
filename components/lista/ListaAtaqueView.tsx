"use client";
import { useMemo, useState, useEffect, useDeferredValue, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, X, Swords, SlidersHorizontal, CheckCircle2, XCircle, Eye, Eraser, Loader2, Star, GripVertical, RotateCcw } from "lucide-react";
import { Badge, Empty, Select, Input } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { ScrollboxTop } from "@/components/ui/ScrollboxTop";
import { Paginator } from "@/components/ui/Paginator";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { NomeFornecedor } from "@/components/ui/NomeFornecedor";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { supabaseBrowser } from "@/lib/supabase/client";
import { brl, fmtDate, corUrgencia, corPrioridade, cn } from "@/lib/utils/format";
import type { Col } from "@/lib/utils/export";

const norm = (s: any) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const uniq = (xs: any[]) => Array.from(new Set(xs.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

// Colunas carregadas (enxutas; o objeto completo fica na ficha da oportunidade — reduz o peso).
export const FETCH_COLS = "id,id_oportunidade,orgao_padronizado,nome_orgao,municipio,uf,esfera,categoria_principal,subcategoria,fabricante,nome_fornecedor,possivel_concorrente,valor_total,dias_ate_vencimento,fim_vigencia,janela_comercial,urgencia_comercial,score_comercial,prioridade,responsavel_atribuido,responsavel_sugerido,status_validacao,link_fonte,objeto_original";

const EXPORT_COLS: Col[] = [
  { key: "orgao_padronizado", label: "Órgão" }, { key: "uf", label: "UF" }, { key: "municipio", label: "Município" },
  { key: "categoria_principal", label: "Solução" }, { key: "subcategoria", label: "Subcategoria" },
  { key: "fabricante", label: "Fabricante" },
  { key: "nome_fornecedor", label: "Fornecedor atual" }, { key: "valor_total", label: "Valor (R$)" },
  { key: "dias_ate_vencimento", label: "Dias p/ vencer" }, { key: "fim_vigencia", label: "Fim vigência" },
  { key: "janela_comercial", label: "Janela" }, { key: "urgencia_comercial", label: "Urgência" },
  { key: "score_comercial", label: "Score" }, { key: "prioridade", label: "Prioridade" }, { key: "status_validacao", label: "Decisão" },
  { key: "responsavel_atribuido", label: "Responsável" }, { key: "id_oportunidade", label: "ID" }, { key: "link_fonte", label: "Fonte" },
];

const DECISAO_INFO: Record<string, { label: string; cls: string }> = {
  "Em análise": { label: "Em análise", cls: "text-amber-600 dark:text-amber-400" },
  "Validada": { label: "Validada", cls: "text-emerald-600 dark:text-emerald-400" },
  "Monitoramento": { label: "Monitorada", cls: "text-blue-600 dark:text-blue-400" },
  "Descartada": { label: "Descartada", cls: "text-red-600 dark:text-red-400" },
};

const COLS_DEF: { key: string; label: string; thClass?: string; tdClass?: string; render: (o: any) => any }[] = [
  { key: "orgao", label: "Órgão", tdClass: "max-w-[260px]", render: (o) => (<><div className="font-semibold text-fg truncate">{o.orgao_padronizado || o.nome_orgao || "—"}</div><div className="text-xs text-muted">{[o.municipio, o.uf].filter(Boolean).join(" · ") || "—"}{o.esfera ? ` · ${o.esfera}` : ""}</div></>) },
  { key: "solucao", label: "O que é (solução)", tdClass: "max-w-[320px]", render: (o) => (<div className="text-fg font-medium truncate">{o.categoria_principal || "—"}{o.subcategoria ? ` · ${o.subcategoria}` : ""}</div>) },
  { key: "fabricante", label: "Fabricante", tdClass: "whitespace-nowrap", render: (o) => o.fabricante ? <Badge tone="navy">{o.fabricante}</Badge> : <span className="text-muted text-xs">—</span> },
  { key: "fornecedor", label: "Fornecedor atual", tdClass: "max-w-[170px]", render: (o) => (<div className="text-muted truncate flex items-center gap-1"><NomeFornecedor name={o.nome_fornecedor} />{o.possivel_concorrente ? <Swords size={12} className="text-red-500 shrink-0" /> : null}</div>) },
  { key: "valor", label: "Valor", thClass: "text-right", tdClass: "text-right font-semibold text-fg whitespace-nowrap", render: (o) => brl(o.valor_total) },
  { key: "vence", label: "Vence", thClass: "whitespace-nowrap", tdClass: "whitespace-nowrap text-muted", render: (o) => typeof o.dias_ate_vencimento === "number" ? <span className={cn(o.dias_ate_vencimento < 0 ? "text-red-500 font-semibold" : o.dias_ate_vencimento <= 30 ? "text-amber-500 font-semibold" : "")}>{o.dias_ate_vencimento}d</span> : fmtDate(o.fim_vigencia) },
  { key: "urgencia", label: "Urgência", render: (o) => <Badge className={corUrgencia(o.urgencia_comercial)}>{o.urgencia_comercial || "—"}</Badge> },
  { key: "score", label: "Score", render: (o) => <Badge className={corPrioridade(o.prioridade)}>{o.score_comercial ?? "—"}</Badge> },
  { key: "resp", label: "Resp.", tdClass: "text-xs text-muted max-w-[110px] truncate", render: (o) => o.responsavel_atribuido || o.responsavel_sugerido || "—" },
  { key: "decisao", label: "Decisão", render: (o) => { const i = DECISAO_INFO[o.status_validacao]; return i ? <span className={cn("text-xs font-semibold", i.cls)}>{i.label}</span> : <span className="text-muted text-xs">—</span>; } },
];
const ALL_KEYS = COLS_DEF.map((c) => c.key);

export function ListaAtaqueView({ vcUfs = null, total = 0, vencInicial = "", canAct = false, focoOrgaos = null, initialRows = null }: { vcUfs?: string[] | null; total?: number; vencInicial?: string; canAct?: boolean; focoOrgaos?: string[] | null; initialRows?: any[] | null }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const temFoco = !!(focoOrgaos && focoOrgaos.length);

  // ── carrega TUDO direto do banco (no navegador → RLS aplicada; sem sobrecarregar o servidor) ──
  const [linhas, setLinhas] = useState<any[]>(initialRows || []);
  const [loading, setLoading] = useState(!(initialRows && initialRows.length));
  const ufsKey = (vcUfs || []).join(",");
  async function carregar() {
    setLoading(true);
    const sb = supabaseBrowser();
    const PAGE = 20000; const acc: any[] = [];
    try {
      for (let i = 0; i < 12; i++) {
        let qb: any = sb.from("vw_lista_ataque_atual").select(FETCH_COLS);
        if (vcUfs && vcUfs.length) qb = qb.in("uf", vcUfs);
        // Tabela plana indexada por score → rápido. Carrega as mais relevantes primeiro e vai
        // preenchendo o resto em segundo plano (a 1ª leva já aparece; o filtro cobre TODAS as 122k).
        const { data, error } = await qb.order("score_comercial", { ascending: false, nullsFirst: false }).order("id", { ascending: true }).range(i * PAGE, i * PAGE + PAGE - 1);
        if (error || !data || !data.length) break;
        acc.push(...data);
        setLinhas([...acc]);            // render progressivo
        if (i === 0) setLoading(false); // some o spinner assim que a 1ª leva chega
        if (data.length < PAGE) break;
      }
    } catch { /* devolve o que tiver */ }
    setLinhas([...acc]); setLoading(false);
  }
  useEffect(() => {
    // Sob "ver como" o servidor já manda as linhas escopadas (initialRows) — não refaz o fetch no navegador.
    if (initialRows && initialRows.length) { setLinhas(initialRows); setLoading(false); return; }
    carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [ufsKey]);

  const [sel, setSel] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q); // adia a re-filtragem das ~122k linhas → digitação fluida
  const [uf, setUf] = useState<string[]>([]);
  const [orgao, setOrgao] = useState<string[]>(temFoco ? focoOrgaos! : []);
  const [solucao, setSolucao] = useState<string[]>([]);
  const [urg, setUrg] = useState<string[]>([]);
  const [venc, setVenc] = useState(vencInicial);
  const [decisao, setDecisao] = useState("ativas");
  const [sort, setSort] = useState("score");
  const PER = 100;
  const [page, setPage] = useState(1);

  // ── Colunas: ordem + visibilidade, salvas no aparelho (por usuário/navegador) ──
  const LS_ORDER = "mapper.lista.colOrder", LS_HIDDEN = "mapper.lista.colHidden";
  const [colOrder, setColOrder] = useState<string[]>(ALL_KEYS);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const dragIdx = useRef<number | null>(null);
  useEffect(() => {
    try {
      const o = JSON.parse(localStorage.getItem(LS_ORDER) || "null");
      if (Array.isArray(o)) { const v = o.filter((k: string) => ALL_KEYS.includes(k)); setColOrder([...v, ...ALL_KEYS.filter((k) => !v.includes(k))]); }
      const h = JSON.parse(localStorage.getItem(LS_HIDDEN) || "null");
      if (Array.isArray(h)) setHidden(new Set(h.filter((k: string) => ALL_KEYS.includes(k))));
    } catch { /* sem preferências salvas */ }
  }, []);
  function persistOrder(o: string[]) { setColOrder(o); try { localStorage.setItem(LS_ORDER, JSON.stringify(o)); } catch {} }
  function persistHidden(h: Set<string>) { setHidden(new Set(h)); try { localStorage.setItem(LS_HIDDEN, JSON.stringify([...h])); } catch {} }
  function toggleCol(k: string) { const n = new Set(hidden); n.has(k) ? n.delete(k) : n.add(k); if (ALL_KEYS.length - n.size < 1) return; persistHidden(n); }
  function resetCols() { persistOrder([...ALL_KEYS]); persistHidden(new Set()); }
  function dropCol(to: number) { const from = dragIdx.current; dragIdx.current = null; if (from == null || from === to) return; const o = [...colOrder]; const [m] = o.splice(from, 1); o.splice(to, 0, m); persistOrder(o); }
  const cols = colOrder.map((k) => COLS_DEF.find((c) => c.key === k)).filter((c): c is typeof COLS_DEF[number] => !!c && !hidden.has(c.key));

  const opts = useMemo(() => ({
    uf: uniq(linhas.map((l) => l.uf)), orgao: uniq(linhas.map((l) => l.orgao_padronizado)),
    solucao: uniq(linhas.map((l) => l.categoria_principal)), urg: uniq(linhas.map((l) => l.urgencia_comercial)),
  }), [linhas]);

  const vencOk = (l: any) => {
    if (!venc) return true;
    const d = l.dias_ate_vencimento;
    if (typeof d !== "number") return false;
    if (venc === "vencidos") return d < 0;
    if (venc.endsWith("+")) return d >= parseInt(venc, 10);
    if (venc.includes("-")) { const [a, b] = venc.split("-").map((x) => parseInt(x, 10)); return d >= a && d <= b; }
    return d >= 0 && d <= parseInt(venc, 10);
  };
  const decisaoOk = (l: any) => {
    const s = l.status_validacao || "Pendente";
    if (decisao === "") return true;
    if (decisao === "ativas") return s !== "Descartada";
    return s === decisao;
  };
  const filtradas = useMemo(() => {
    const nq = norm(dq);
    let r = linhas.filter((l) =>
      (!uf.length || uf.includes(l.uf)) && (!orgao.length || orgao.includes(l.orgao_padronizado)) &&
      (!solucao.length || solucao.includes(l.categoria_principal)) && (!urg.length || urg.includes(l.urgencia_comercial)) && vencOk(l) && decisaoOk(l) &&
      (!nq || norm(`${l.orgao_padronizado} ${l.nome_orgao} ${l.nome_fornecedor} ${l.categoria_principal} ${l.subcategoria} ${l.municipio} ${l.uf} ${l.objeto_original}`).includes(nq))
    );
    const dir = (a: number, b: number) => b - a;
    r = [...r].sort((a, b) =>
      sort === "valor" ? dir(Number(a.valor_total) || 0, Number(b.valor_total) || 0)
        : sort === "vence" ? ((a.dias_ate_vencimento ?? 9e9) - (b.dias_ate_vencimento ?? 9e9))
          : dir(Number(a.score_comercial) || 0, Number(b.score_comercial) || 0));
    return r;
  }, [linhas, dq, uf, orgao, solucao, urg, venc, decisao, sort]);
  useEffect(() => { setPage(1); }, [dq, uf, orgao, solucao, urg, venc, decisao, sort]);
  const pageRows = useMemo(() => filtradas.slice((page - 1) * PER, page * PER), [filtradas, page]);

  const descartadasOcultas = useMemo(() => decisao === "ativas" ? linhas.filter((l) => (l.status_validacao || "Pendente") === "Descartada").length : 0, [linhas, decisao]);
  const mostrandoFoco = temFoco && orgao.length === focoOrgaos!.length && focoOrgaos!.every((x) => orgao.includes(x));
  const ativos = !!q || uf.length > 0 || (orgao.length > 0 && !mostrandoFoco) || solucao.length > 0 || urg.length > 0 || !!venc || decisao !== "ativas";
  function limpar() { setQ(""); setUf([]); setOrgao(temFoco ? focoOrgaos! : []); setSolucao([]); setUrg([]); setDecisao("ativas"); setVenc(""); }

  // ── seleção em massa ──
  const idsFiltrados = useMemo(() => filtradas.map((l) => l.id).filter((x) => x != null), [filtradas]);
  const todasMarcadas = idsFiltrados.length > 0 && idsFiltrados.every((id) => sel.has(id));
  function toggleSel(id: number) { setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleTodas() { setSel((s) => { if (idsFiltrados.every((id) => s.has(id))) { const n = new Set(s); idsFiltrados.forEach((id) => n.delete(id)); return n; } return new Set([...s, ...idsFiltrados]); }); }
  function limparSel() { setSel(new Set()); setBulkMsg(""); }

  const DECISOES: { v: string; label: string; Icon: any; cls: string; danger?: boolean }[] = [
    { v: "Em análise", label: "Em análise", Icon: Search, cls: "border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10" },
    { v: "Validada", label: "Validar", Icon: CheckCircle2, cls: "border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" },
    { v: "Monitoramento", label: "Monitorar", Icon: Eye, cls: "border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10" },
    { v: "Descartada", label: "Descartar", Icon: XCircle, cls: "border-red-500 text-red-600 dark:text-red-400 hover:bg-red-500/10", danger: true },
  ];
  async function aplicarDecisao(v: string) {
    const ids = [...sel]; if (!ids.length) return;
    setBulkBusy(true); setBulkMsg("");
    try {
      const r = await fetch("/api/opportunity-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "validacao", value: v, oportunidade_ids: ids }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setBulkMsg(`✓ ${j.message || "Pronto."}`); setSel(new Set()); carregar(); }
      else setBulkMsg(j.error || "Falha ao aplicar.");
    } catch { setBulkMsg("Erro de rede."); } finally { setBulkBusy(false); }
  }
  function pedirDecisao(d: { v: string; label: string; danger?: boolean }) {
    const n = sel.size;
    if (d.danger || n > 1) {
      confirm({
        title: `${d.label} ${n} contrato(s)?`,
        danger: !!d.danger,
        confirmLabel: d.label,
        description: d.v === "Descartada"
          ? <>Eles saem da Lista de Ataque (vão para <b>“descartadas”</b>, sem apagar nada — dá para reverter pelo filtro de decisão).</>
          : <>Marca <b>{n}</b> contrato(s) como <b>{d.label}</b> de uma vez.</>,
      }, () => aplicarDecisao(d.v));
    } else { aplicarDecisao(d.v); }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar (filtros) */}
      <div className="bg-surface border border-line rounded-xl p-3 shadow-soft space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-3 relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Buscar órgão, fornecedor, solução…" className="pl-8" />
          </div>
          <MultiCombobox className="min-w-0 md:col-span-3" value={orgao} onChange={setOrgao} options={opts.orgao} label="Órgãos" allLabel="Órgão (todos)" />
          <MultiCombobox className="min-w-0 md:col-span-2" value={solucao} onChange={setSolucao} options={opts.solucao} label="Soluções" allLabel="Solução (todas)" />
          <MultiCombobox className="min-w-0 md:col-span-2" value={uf} onChange={setUf} options={opts.uf} label="UFs" allLabel="Todas as UFs" />
          <MultiCombobox className="min-w-0 md:col-span-2" value={urg} onChange={setUrg} options={opts.urg} label="Urgências" allLabel="Todas urgências" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={venc} onChange={(e: any) => setVenc(e.target.value)} className="h-8 w-auto">
              <option value="">Vencimento: qualquer período</option>
              <option value="vencidos">já vencidos (atrasados)</option>
              <option value="0-30">vence de 0 a 30 dias</option>
              <option value="31-60">vence de 31 a 60 dias</option>
              <option value="61-90">vence de 61 a 90 dias</option>
              <option value="91-180">vence de 91 a 180 dias</option>
              <option value="181-365">vence de 181 a 365 dias</option>
              <option value="365+">vence em mais de 365 dias</option>
            </Select>
            <Select value={decisao} onChange={(e: any) => setDecisao(e.target.value)} className="h-8 w-auto" title="Filtrar pela sua decisão">
              <option value="ativas">Decisão: ativas (oculta descartadas)</option>
              <option value="">todas as decisões</option>
              <option value="Pendente">sem decisão (pendentes)</option>
              <option value="Em análise">em análise</option>
              <option value="Validada">validadas</option>
              <option value="Monitoramento">monitoradas</option>
              <option value="Descartada">descartadas</option>
            </Select>
            <span className="text-xs text-muted">Ordenar:</span>
            <Select value={sort} onChange={(e: any) => setSort(e.target.value)} className="h-8 w-auto">
              <option value="score">Maior score</option><option value="valor">Maior valor</option><option value="vence">Vence antes</option>
            </Select>
            <button type="button" onClick={() => setColsOpen(true)}
              className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-fg hover:bg-surface2">
              <SlidersHorizontal size={13} /> Colunas{hidden.size > 0 ? ` (${ALL_KEYS.length - hidden.size}/${ALL_KEYS.length})` : ""}
            </button>
            {temFoco && (
              <span className="inline-flex items-center rounded-lg border border-line overflow-hidden" title="Mostrar só os órgãos que você acompanha, ou todos">
                <button onClick={() => setOrgao(focoOrgaos!)} className={cn("inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold transition", mostrandoFoco ? "bg-brand text-white" : "text-muted hover:bg-surface2")}><Star size={13} /> Meus órgãos ({focoOrgaos!.length})</button>
                <button onClick={() => setOrgao([])} className={cn("h-8 px-2.5 text-xs font-semibold transition border-l border-line", orgao.length === 0 ? "bg-brand text-white" : "text-muted hover:bg-surface2")}>Todos</button>
              </span>
            )}
            <button onClick={limpar} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/10 transition"><Eraser size={13} /> Limpar filtros</button>
          </div>
          <ExportButtons rows={filtradas} columns={EXPORT_COLS} filename="mapper_lista_ataque" />
        </div>
      </div>

      <div className="text-xs text-muted px-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        {loading
          ? <span className="inline-flex items-center gap-1.5 text-brand"><Loader2 size={13} className="animate-spin" /> carregando todas as oportunidades…</span>
          : <span><b className="text-fg">{filtradas.length.toLocaleString("pt-BR")}</b> mostrada(s){ativos ? " (filtrado)" : ""} · <b className="text-fg">{(total || linhas.length).toLocaleString("pt-BR")}</b> no total (todas carregadas)</span>}
        {!loading && descartadasOcultas > 0 && <button onClick={() => setDecisao("Descartada")} className="text-red-500 hover:underline">· {descartadasOcultas} descartada(s) oculta(s)</button>}
        {!loading && canAct && filtradas.length > 0 && <button onClick={toggleTodas} className="text-brand hover:underline">· {todasMarcadas ? "desmarcar todas" : "selecionar todas as filtradas"}</button>}
      </div>

      <details className="px-1">
        <summary className="cursor-pointer text-xs text-brand hover:underline list-none inline-flex items-center gap-1">❔ O que significa cada decisão (e onde elas ficam)?</summary>
        <div className="mt-1.5 text-xs text-muted leading-relaxed bg-surface2/40 border border-line rounded-lg px-3 py-2.5 max-w-3xl">
          <div className="flex flex-col gap-1">
            <span><b className="text-amber-600 dark:text-amber-400">Em análise</b> — você está avaliando este contrato (ainda decidindo).</span>
            <span><b className="text-emerald-600 dark:text-emerald-400">Validar</b> — confirma que é uma boa oportunidade real; sai da fila de revisão.</span>
            <span><b className="text-blue-600 dark:text-blue-400">Monitorar</b> — acompanhar sem agir agora (ex.: contrato longe de vencer).</span>
            <span><b className="text-red-600 dark:text-red-400">Descartar</b> — não interessa; some desta lista (vai para “descartadas”, reversível).</span>
          </div>
          <div className="mt-2 pt-2 border-t border-line text-fg">📍 <b>Onde ficam:</b> toda decisão é salva. Use o filtro <b>Decisão</b> aqui em cima para abrir cada grupo quando quiser revisar depois.</div>
        </div>
      </details>

      {canAct && sel.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-brand/10 border border-brand/30 rounded-xl px-3 py-2 shadow-soft">
          <span className="text-sm font-semibold text-fg"><b>{sel.size}</b> selecionada(s) · decidir:</span>
          {DECISOES.map((d) => (
            <button key={d.v} disabled={bulkBusy} onClick={() => pedirDecisao(d)}
              className={cn("inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border bg-surface transition disabled:opacity-50", d.cls)}>
              <d.Icon size={14} /> {d.label}
            </button>
          ))}
          {bulkMsg && <span className="text-xs text-muted">{bulkMsg}</span>}
          <button onClick={limparSel} className="ml-auto text-xs text-muted hover:text-fg inline-flex items-center gap-1"><X size={13} /> limpar seleção</button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted py-16 border border-dashed border-line rounded-xl bg-surface flex flex-col items-center gap-2">
          <Loader2 size={26} className="animate-spin text-brand" />
          <div>Carregando todas as oportunidades… (pode levar alguns segundos)</div>
        </div>
      ) : filtradas.length === 0 ? (
        <Empty>Nenhuma oportunidade com esses filtros. {ativos ? "Tente limpar os filtros." : "Conecte o banco e rode uma rodada de produção."}</Empty>
      ) : (
        <>
        <Paginator page={page} setPage={setPage} total={filtradas.length} perPage={PER} />
        <ScrollboxTop>
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky z-20" style={{ top: 0 }}>
              <tr className="text-left text-xs uppercase tracking-wide text-muted font-bold bg-surface2 border-b-2 border-line shadow-[0_6px_8px_-4px_rgba(0,0,0,0.28)]">
                {canAct && <th className="px-3 py-3.5 w-9 bg-surface2 border-b-2 border-line"><input type="checkbox" aria-label="selecionar todas" checked={todasMarcadas} onChange={toggleTodas} className="h-4 w-4 accent-brand align-middle" /></th>}
                {cols.map((c) => <th key={c.key} className={cn("px-4 py-3 bg-surface2 border-b-2 border-line", c.thClass)}>{c.label}</th>)}
                <th className="px-4 py-3 bg-surface2 border-b-2 border-line"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((o) => (
                <tr key={o.id}
                  onClick={() => router.push(`/oportunidades/${o.id ?? o.id_oportunidade}`)}
                  className={cn("group cursor-pointer hover:bg-surface2 transition [&>td]:border-b [&>td]:border-line", o.id != null && sel.has(o.id) && "bg-brand/5")}>
                  {canAct && (
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="selecionar" checked={o.id != null && sel.has(o.id)} disabled={o.id == null}
                        onChange={() => o.id != null && toggleSel(o.id)} className="h-4 w-4 accent-brand align-middle" />
                    </td>
                  )}
                  {cols.map((c) => <td key={c.key} className={cn("px-4 py-3", c.tdClass)}>{c.render(o)}</td>)}
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={16} className="inline text-muted group-hover:text-brand transition" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollboxTop>
        <Paginator page={page} setPage={setPage} total={filtradas.length} perPage={PER} />
        </>
      )}

      {/* Modal de Colunas — arrastar p/ reordenar, marcar p/ mostrar, restaurar padrão. Fica acima de tudo (z-[60]). */}
      {colsOpen && typeof document !== "undefined" && createPortal((
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={() => setColsOpen(false)} />
          <div className="relative w-full max-w-sm bg-surface border border-line rounded-2xl shadow-xl p-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center gap-2 mb-1">
              <b className="text-fg">Colunas</b><span className="text-xs text-muted">— arraste para reordenar; marque para mostrar</span>
              <button onClick={() => setColsOpen(false)} className="ml-auto text-muted hover:text-fg" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-line divide-y divide-line mt-1">
              {colOrder.map((k, idx) => { const c = COLS_DEF.find((x) => x.key === k); if (!c) return null; return (
                <div key={k} draggable onDragStart={() => { dragIdx.current = idx; }} onDragOver={(e) => e.preventDefault()} onDrop={() => dropCol(idx)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 cursor-grab active:cursor-grabbing select-none">
                  <GripVertical size={14} className="text-muted shrink-0" />
                  <input type="checkbox" checked={!hidden.has(k)} onChange={() => toggleCol(k)} className="h-4 w-4 accent-brand shrink-0" onClick={(e) => e.stopPropagation()} />
                  <span className="truncate text-fg">{c.label}</span>
                </div>); })}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setColsOpen(false)} className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90">Concluir</button>
              <button onClick={resetCols} className="text-sm text-muted hover:text-fg px-2 inline-flex items-center gap-1"><RotateCcw size={13} /> Restaurar padrão</button>
            </div>
          </div>
        </div>
      ), document.body)}
      {dialog}
    </div>
  );
}
