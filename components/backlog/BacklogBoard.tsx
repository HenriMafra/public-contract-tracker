"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { Plus, X, Search, Calendar, MessageSquare, CheckSquare, Tag, Trash2, GripVertical, User2, Flag, UserPlus, CheckCircle2, Users, Maximize2 } from "lucide-react";
import { cn, semAcento } from "@/lib/utils/format";

type Card = any;
type User = { id: string; nome: string; role?: string };

const COLUNAS: { key: string; label: string; dot: string }[] = [
  { key: "a_fazer", label: "A fazer", dot: "bg-slate-400" },
  { key: "fazendo", label: "Fazendo", dot: "bg-blue-500" },
  { key: "revisao", label: "Em revisão", dot: "bg-amber-500" },
  { key: "feito", label: "Feito", dot: "bg-emerald-500" },
];
const PRIO = { alta: "bg-red-500/15 text-red-600 dark:text-red-400", media: "bg-amber-500/15 text-amber-700 dark:text-amber-400", baixa: "bg-surface2 text-muted" } as Record<string, string>;
const PRIO_LABEL = { alta: "Alta", media: "Média", baixa: "Baixa" } as Record<string, string>;
const LABEL_CORES = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-red-500", "bg-violet-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500"];
function corEtiqueta(t: string) { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return LABEL_CORES[h % LABEL_CORES.length]; }
function iniciais(n: string) { return (n || "?").split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase(); }
function prazoInfo(p?: string) {
  if (!p) return null;
  const d = new Date(p + "T00:00:00"); if (isNaN(d.getTime())) return null;
  const dias = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const txt = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const cls = dias < 0 ? "bg-red-500/15 text-red-600 dark:text-red-400" : dias <= 3 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-surface2 text-muted";
  return { txt: dias < 0 ? `${txt} (atrasada)` : txt, cls };
}
async function call(body: any) { const r = await fetch("/api/backlog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { ok: r.ok, j: await r.json().catch(() => ({})) }; }

export function BacklogBoard({ cards, usuarios, podeAtribuir, podeDelegar = false, meId, meNome }: { cards: Card[]; usuarios: User[]; podeAtribuir: boolean; podeDelegar?: boolean; meId: string; meNome: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Card[]>(cards);
  useEffect(() => { setItems(cards); }, [cards]);
  const [busca, setBusca] = useState("");
  const [soMinhas, setSoMinhas] = useState(false);
  const [soGrupo, setSoGrupo] = useState(false);
  const [delegar, setDelegar] = useState(false);
  const [novo, setNovo] = useState<Record<string, string>>({});
  const [abrindo, setAbrindo] = useState<string>("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string>("");
  const [aberto, setAberto] = useState<number | null>(null);

  const nq = semAcento(busca);
  const visiveis = useMemo(() => items.filter((c) =>
    (!nq || semAcento(`${c.titulo} ${c.descricao || ""} ${(c.etiquetas || []).join(" ")} ${(c.responsaveis || []).map((r: any) => r.nome).join(" ")}`).includes(nq)) &&
    (!soMinhas || (c.responsaveis || []).some((r: any) => r.id === meId)) &&
    (!soGrupo || (c.responsaveis || []).length >= 2)
  ), [items, nq, soMinhas, soGrupo, meId]);
  const porColuna = (k: string) => visiveis.filter((c) => c.coluna === k);

  async function criar(coluna: string) {
    const titulo = (novo[coluna] || "").trim(); if (!titulo) return;
    setNovo((n) => ({ ...n, [coluna]: "" })); setAbrindo("");
    await call({ action: "create", titulo, coluna });
    router.refresh();
  }
  async function soltar(coluna: string) {
    const id = dragId; setDragId(null); setOverCol("");
    if (id == null) return;
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, coluna } : c))); // otimista
    await call({ action: "move", id, coluna });
    router.refresh();
  }
  // mover direto para uma coluna (botão rápido "✓ feito" no próprio cartão)
  async function moverPara(id: number, coluna: string) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, coluna } : c)));
    await call({ action: "move", id, coluna });
    router.refresh();
  }
  const cardAberto = items.find((c) => c.id === aberto);

  return (
    <div className="space-y-3">
      {/* filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={busca} onChange={(e: any) => setBusca(e.target.value)} placeholder="Buscar tarefa, etiqueta, responsável…" className="pl-8" />
        </div>
        <button onClick={() => setSoMinhas((v) => !v)} className={cn("inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-semibold transition", soMinhas ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-muted hover:text-fg")}>
          <User2 size={15} /> {soMinhas ? "Minhas tarefas" : "Todas"}
        </button>
        <button onClick={() => setSoGrupo((v) => !v)} title="Mostrar só as tarefas compartilhadas entre 2+ pessoas" className={cn("inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-semibold transition", soGrupo ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-300" : "border-line bg-surface text-muted hover:text-fg")}>
          <Users size={15} /> Em grupo
        </button>
        {podeDelegar && (
          <button onClick={() => setDelegar(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-600 transition">
            <UserPlus size={15} /> Atribuir tarefa a alguém
          </button>
        )}
        <span className="text-xs text-muted ml-auto">{visiveis.length} tarefa(s)</span>
      </div>

      {/* quadro */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {COLUNAS.map((col) => {
          const lista = porColuna(col.key);
          return (
            <div key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? "" : c))}
              onDrop={() => soltar(col.key)}
              className={cn("rounded-xl border bg-surface2/40 p-2 flex flex-col min-h-[180px] transition", overCol === col.key ? "border-brand ring-2 ring-brand/30" : "border-line")}>
              <div className="flex items-center gap-2 px-1.5 py-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", col.dot)} />
                <span className="font-bold text-fg text-sm">{col.label}</span>
                <span className="text-xs text-muted bg-surface rounded-full px-2 py-0.5">{lista.length}</span>
              </div>

              {/* adicionar cartão — NO TOPO da coluna */}
              {abrindo === col.key ? (
                <div className="mb-2 space-y-1.5">
                  <textarea autoFocus value={novo[col.key] || ""} onChange={(e) => setNovo((n) => ({ ...n, [col.key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); criar(col.key); } }}
                    placeholder="Título da tarefa…" className="w-full text-sm rounded-lg border border-line bg-surface px-2.5 py-2 resize-y min-h-[52px] focus:outline-none focus:ring-2 focus:ring-brand/30" />
                  <div className="flex items-center gap-2">
                    <Button className="h-8" onClick={() => criar(col.key)}>Adicionar</Button>
                    <button onClick={() => { setAbrindo(""); setNovo((n) => ({ ...n, [col.key]: "" })); }} className="text-muted hover:text-fg"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAbrindo(col.key)} className="mb-2 w-full text-left text-sm text-muted hover:text-fg rounded-lg px-2.5 py-2 inline-flex items-center gap-1.5 border border-dashed border-line hover:border-brand/50 hover:bg-surface transition"><Plus size={15} /> Adicionar cartão</button>
              )}

              <div className="space-y-2 flex-1">
                {lista.length === 0 && <div className="text-center text-xs text-muted/70 py-6 select-none">sem tarefas aqui</div>}
                {lista.map((c) => {
                  const pz = prazoInfo(c.prazo);
                  const done = (c.checklist || []).filter((x: any) => x.feito).length;
                  const tot = (c.checklist || []).length;
                  const emGrupo = (c.responsaveis || []).length >= 2;
                  return (
                    <div key={c.id} draggable onDragStart={() => setDragId(c.id)} onDragEnd={() => { setDragId(null); setOverCol(""); }}
                      onClick={() => setAberto(c.id)}
                      className={cn("group relative rounded-lg border border-line bg-surface p-3 shadow-soft hover:border-brand hover:shadow-md cursor-pointer transition", emGrupo && "border-l-[3px] border-l-violet-400")}>
                      {col.key === "feito"
                        ? <button title="Reabrir (volta para A fazer)" onClick={(e) => { e.stopPropagation(); moverPara(c.id, "a_fazer"); }} className="absolute top-2 right-2 text-emerald-500 hover:scale-110 transition" aria-label="reabrir"><CheckCircle2 size={19} /></button>
                        : <button title="Concluir — marcar como Feito (sem abrir o cartão)" onClick={(e) => { e.stopPropagation(); moverPara(c.id, "feito"); }} className="absolute top-2 right-2 text-emerald-600/70 hover:text-emerald-600 hover:scale-110 transition" aria-label="concluir"><CheckCircle2 size={19} /></button>}
                      {(c.etiquetas || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {c.etiquetas.map((e: string, i: number) => <span key={i} className={cn("h-1.5 w-8 rounded-full", corEtiqueta(e))} title={e} />)}
                        </div>
                      )}
                      <div className={cn("text-sm text-fg font-semibold leading-snug pr-6", col.key === "feito" && "line-through text-muted")}>{c.titulo}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {c.origem === "ro" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand">RO</span>}
                        {c.origem === "contrato" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">Contrato</span>}
                        {c.prioridade && <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", PRIO[c.prioridade])}><Flag size={10} /> {PRIO_LABEL[c.prioridade] || c.prioridade}</span>}
                        {pz && <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", pz.cls)}><Calendar size={10} /> {pz.txt}</span>}
                        {tot > 0 && <span className={cn("inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full", done === tot ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-surface2 text-muted")}><CheckSquare size={10} /> {done}/{tot}</span>}
                        {(c.comentarios || []).length > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-muted"><MessageSquare size={10} /> {c.comentarios.length}</span>}
                        {emGrupo && <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300" title="Tarefa compartilhada entre várias pessoas"><Users size={10} /> Em grupo</span>}
                        <div className="ml-auto flex -space-x-1.5">
                          {(c.responsaveis || []).slice(0, 3).map((r: any, i: number) => (
                            <span key={i} title={r.nome} className="w-5 h-5 rounded-full bg-brand/15 text-brand grid place-items-center text-[9px] font-bold ring-1 ring-surface">{iniciais(r.nome)}</span>
                          ))}
                          {(c.responsaveis || []).length > 3 && <span className="w-5 h-5 rounded-full bg-surface2 text-muted grid place-items-center text-[9px] font-bold ring-1 ring-surface">+{(c.responsaveis || []).length - 3}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {cardAberto && <CardModal card={cardAberto} usuarios={usuarios} podeAtribuir={podeAtribuir} onClose={() => setAberto(null)} onMudou={() => router.refresh()} />}
      {delegar && <DelegarModal usuarios={usuarios} onClose={() => setDelegar(false)} onCriou={() => { setDelegar(false); router.refresh(); }} />}
    </div>
  );
}

/** Diretoria/Admin: cria uma tarefa JÁ atribuída a uma ou mais pessoas — cai direto no
 *  "Minhas tarefas" de cada uma. Usa a action create da API (que aceita responsaveis). */
function DelegarModal({ usuarios, onClose, onCriou }: { usuarios: User[]; onClose: () => void; onCriou: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [coluna, setColuna] = useState("a_fazer");
  const [prioridade, setPrioridade] = useState("");
  const [prazo, setPrazo] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const lab = "text-xs uppercase tracking-wider text-muted font-semibold";

  const ids = Object.keys(sel);
  const toggle = (u: User) => setSel((s) => { const n = { ...s }; if (n[u.id]) delete n[u.id]; else n[u.id] = u.nome; return n; });
  const lista = usuarios.filter((u) => !q.trim() || `${u.nome} ${u.role || ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  async function criar() {
    if (!titulo.trim()) { setErro("Dê um título à tarefa."); return; }
    if (ids.length === 0) { setErro("Escolha pelo menos uma pessoa."); return; }
    setBusy(true); setErro("");
    const responsaveis = ids.map((id) => ({ id, nome: sel[id] }));
    const { ok, j } = await call({ action: "create", titulo: titulo.trim(), descricao: descricao.trim(), coluna, prioridade, prazo: prazo || null, responsaveis });
    setBusy(false);
    if (ok) onCriou(); else setErro(j?.error || "Falha ao criar a tarefa.");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-auto" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-line rounded-2xl shadow-xl p-5 my-8">
        <button onClick={onClose} className="absolute right-3 top-3 text-muted hover:text-fg"><X size={20} /></button>
        <div className="font-extrabold text-fg text-lg mb-1 inline-flex items-center gap-2"><UserPlus size={18} className="text-brand" /> Atribuir tarefa a alguém</div>
        <p className="text-xs text-muted mb-4">A tarefa nasce já no backlog da(s) pessoa(s) escolhida(s) — elas veem em <b>“Minhas tarefas”</b>.</p>

        <div className="space-y-3">
          <div><div className={lab}>Título *</div>
            <Input value={titulo} onChange={(e: any) => setTitulo(e.target.value)} placeholder="O que precisa ser feito" className="mt-1" /></div>
          <div><div className={lab}>Descrição</div>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Detalhes (opcional)" className="mt-1 w-full rounded-lg border border-line bg-surface text-fg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/30" /></div>

          <div><div className={lab}>Para quem * {ids.length > 0 && <span className="text-brand normal-case">({ids.length} selecionada(s))</span>}</div>
            <div className="mt-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoa…" className="w-full h-9 pl-8 pr-3 rounded-lg border border-line bg-surface text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div className="mt-1.5 max-h-40 overflow-auto rounded-lg border border-line divide-y divide-line">
              {lista.length === 0 ? <div className="text-xs text-muted p-2">Nenhuma pessoa.</div> : lista.map((u) => (
                <label key={u.id} className="flex items-center gap-2 px-2.5 py-2 text-sm hover:bg-surface2 cursor-pointer">
                  <input type="checkbox" checked={!!sel[u.id]} onChange={() => toggle(u)} className="accent-brand" />
                  <span className="text-fg truncate flex-1">{u.nome}</span><span className="text-xs text-muted">{u.role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div><div className={lab}>Coluna</div>
              <select value={coluna} onChange={(e) => setColuna(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm">
                {COLUNAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select></div>
            <div><div className={lab}>Prioridade</div>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm">
                <option value="">—</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
              </select></div>
            <div><div className={lab}>Prazo</div>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm" /></div>
          </div>

          {erro && <div className="text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-600">{erro}</div>}
          <div className="flex items-center gap-2 pt-1">
            <Button disabled={busy} onClick={criar}>{busy ? "Criando…" : "Criar e atribuir"}</Button>
            <button onClick={onClose} className="text-sm text-muted hover:text-fg px-3 py-1.5">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardModal({ card, usuarios, podeAtribuir, onClose, onMudou }: { card: any; usuarios: User[]; podeAtribuir: boolean; onClose: () => void; onMudou: () => void }) {
  const [desc, setDesc] = useState(card.descricao || "");
  const [prioridade, setPrioridade] = useState(card.prioridade || "");
  const [prazo, setPrazo] = useState(card.prazo || "");
  const [etiquetas, setEtiquetas] = useState<string[]>(card.etiquetas || []);
  const [novaEtiq, setNovaEtiq] = useState("");
  const [checklist, setChecklist] = useState<any[]>(card.checklist || []);
  const [novoItem, setNovoItem] = useState("");
  const [responsaveis, setResponsaveis] = useState<any[]>(card.responsaveis || []);
  const [novoComent, setNovoComent] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [descBig, setDescBig] = useState(false); // editor grande de descrição
  const [comentBig, setComentBig] = useState(false); // editor grande de comentários

  async function salvar(extra: any = {}) {
    setBusy(true);
    await call({ action: "update", id: card.id, descricao: desc, prioridade, prazo, etiquetas, checklist, ...extra });
    setBusy(false); onMudou();
  }
  async function setMembros(rs: any[]) { setResponsaveis(rs); await call({ action: "assign", id: card.id, responsaveis: rs }); onMudou(); }
  async function comentar() { const t = novoComent.trim(); if (!t) return; setNovoComent(""); await call({ action: "comentar", card_id: card.id, texto: t }); onMudou(); }
  async function arquivar() { if (!confirm("Arquivar esta tarefa? Ela sai do quadro (não é apagada).")) return; await call({ action: "arquivar", id: card.id, arquivado: true }); onMudou(); onClose(); }

  const toggleMembro = (u: User) => { const has = responsaveis.some((r) => r.id === u.id); setMembros(has ? responsaveis.filter((r) => r.id !== u.id) : [...responsaveis, { id: u.id, nome: u.nome }]); };
  const addEtiq = () => { const t = novaEtiq.trim(); if (t && !etiquetas.includes(t)) { const e = [...etiquetas, t]; setEtiquetas(e); setNovaEtiq(""); salvar({ etiquetas: e }); } };
  const delEtiq = (t: string) => { const e = etiquetas.filter((x) => x !== t); setEtiquetas(e); salvar({ etiquetas: e }); };
  const addItem = () => { const t = novoItem.trim(); if (!t) return; const c = [...checklist, { texto: t, feito: false }]; setChecklist(c); setNovoItem(""); salvar({ checklist: c }); };
  const toggleItem = (i: number) => { const c = checklist.map((x, j) => (j === i ? { ...x, feito: !x.feito } : x)); setChecklist(c); salvar({ checklist: c }); };
  const delItem = (i: number) => { const c = checklist.filter((_, j) => j !== i); setChecklist(c); salvar({ checklist: c }); };
  const lab = "text-xs uppercase tracking-wider text-muted font-semibold";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 overflow-auto" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-xl p-5 my-8">
        <button onClick={onClose} className="absolute right-3 top-3 text-muted hover:text-fg"><X size={20} /></button>
        <div className="flex items-center gap-2 mb-1 pr-8">
          {card.origem === "ro" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand">RO</span>}
          <input defaultValue={card.titulo} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== card.titulo) salvar({ titulo: e.target.value.trim() }); }}
            className="text-lg font-extrabold text-fg bg-transparent w-full focus:outline-none focus:bg-surface2 rounded px-1" />
        </div>
        <div className="text-xs text-muted mb-4 px-1">criada por {card.criado_por || "—"}{card.ro_processo_id ? <> · vinculada ao RO #{card.ro_processo_id}</> : ""}{card.oportunidade_id ? <> · <a href={`/oportunidades/${card.oportunidade_id}`} className="text-brand hover:underline">ver contrato →</a></> : ""}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div><div className={lab}>Prioridade</div>
            <select value={prioridade} onChange={(e) => { setPrioridade(e.target.value); salvar({ prioridade: e.target.value }); }} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm">
              <option value="">— sem —</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
            </select>
          </div>
          <div><div className={lab}>Prazo</div>
            <input type="date" value={prazo || ""} onChange={(e) => { setPrazo(e.target.value); salvar({ prazo: e.target.value }); }} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm" />
          </div>
          <div><div className={cn(lab, "flex items-center gap-1")}>Membros {responsaveis.length >= 2 && <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-300 normal-case font-semibold"><Users size={11} /> em grupo</span>}</div>
            <div className="mt-1 relative">
              <button onClick={() => podeAtribuir && setPickOpen((o) => !o)} disabled={!podeAtribuir} title={podeAtribuir ? "" : "Só Diretoria/AM atribuem a outros"}
                className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm flex items-center gap-1 disabled:opacity-60">
                <span className="flex -space-x-1.5 flex-1">
                  {responsaveis.length === 0 ? <span className="text-muted">ninguém</span> : responsaveis.map((r, i) => <span key={i} title={r.nome} className="w-5 h-5 rounded-full bg-brand/15 text-brand grid place-items-center text-[9px] font-bold ring-1 ring-surface">{iniciais(r.nome)}</span>)}
                </span>
                {podeAtribuir && <Plus size={14} className="text-muted" />}
              </button>
              {pickOpen && podeAtribuir && (
                <div className="absolute z-50 mt-1 left-0 right-0 bg-surface border border-line rounded-lg shadow-xl max-h-56 overflow-auto p-1">
                  {usuarios.length === 0 ? <div className="text-xs text-muted p-2">Nenhum usuário.</div> : usuarios.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-surface2 rounded cursor-pointer">
                      <input type="checkbox" checked={responsaveis.some((r) => r.id === u.id)} onChange={() => toggleMembro(u)} className="accent-brand" />
                      <span className="text-fg truncate">{u.nome}</span><span className="text-xs text-muted ml-auto">{u.role}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className={cn(lab, "mb-1 inline-flex items-center gap-1")}><Tag size={12} /> Etiquetas</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {etiquetas.map((e) => <span key={e} className="inline-flex items-center gap-1 text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{}}><span className={cn("inline-block", corEtiqueta(e), "px-2 py-0.5 rounded-full")}>{e} <button onClick={() => delEtiq(e)} className="ml-0.5">×</button></span></span>)}
            <input value={novaEtiq} onChange={(e) => setNovaEtiq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEtiq(); } }} placeholder="+ etiqueta" className="h-7 w-28 rounded-lg border border-line bg-surface text-fg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
        </div>

        <div className="mb-4">
          <div className={cn(lab, "mb-1 flex items-center gap-1")}>Descrição
            <button onClick={() => setDescBig(true)} className="ml-auto inline-flex items-center gap-1 text-brand hover:underline normal-case font-semibold"><Maximize2 size={12} /> expandir</button>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => salvar()} rows={4} placeholder="Detalhe a tarefa… (clique em “expandir” para um editor maior)" className="w-full rounded-lg border border-line bg-surface text-fg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>

        <div className="mb-4">
          <div className={cn(lab, "mb-1 inline-flex items-center gap-1")}><CheckSquare size={12} /> Checklist {checklist.length > 0 && <span className="text-muted">({checklist.filter((x) => x.feito).length}/{checklist.length})</span>}</div>
          <div className="space-y-1">
            {checklist.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-sm group">
                <input type="checkbox" checked={!!it.feito} onChange={() => toggleItem(i)} className="accent-brand" />
                <span className={cn("flex-1", it.feito && "line-through text-muted")}>{it.texto}</span>
                <button onClick={() => delItem(i)} className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={13} /></button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input value={novoItem} onChange={(e) => setNovoItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} placeholder="+ item" className="h-8 flex-1 rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>
        </div>

        <div className="mb-2">
          <div className={cn(lab, "mb-1 flex items-center gap-1")}><MessageSquare size={12} /> Comentários
            <button onClick={() => setComentBig(true)} className="ml-auto inline-flex items-center gap-1 text-brand hover:underline normal-case font-semibold"><Maximize2 size={12} /> expandir</button>
          </div>
          <div className="space-y-2 mb-2">
            {(card.comentarios || []).map((c: any) => (
              <div key={c.id} className="text-sm bg-surface2/50 rounded-lg px-3 py-2">
                <div className="text-xs text-muted mb-0.5"><b className="text-fg/80">{c.autor || "—"}</b>{c.created_at ? " · " + new Date(c.created_at).toLocaleString("pt-BR") : ""}</div>
                <div className="text-fg whitespace-pre-wrap">{c.texto}</div>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea value={novoComent} onChange={(e) => setNovoComent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); comentar(); } }} rows={2} placeholder="Escrever um comentário… (Ctrl+Enter envia)" className="flex-1 rounded-lg border border-line bg-surface text-fg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <Button className="h-9" onClick={comentar}>Enviar</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
          <button onClick={arquivar} className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg"><Trash2 size={15} /> Arquivar</button>
          {busy && <span className="text-xs text-muted">salvando…</span>}
          <button onClick={onClose} className="ml-auto text-sm text-muted hover:text-fg px-3 py-1.5">Fechar</button>
        </div>

        {descBig && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60" onClick={() => { salvar(); setDescBig(false); }} />
            <div className="relative w-full max-w-3xl h-[80vh] bg-surface border border-line rounded-2xl shadow-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2"><b className="text-fg text-base truncate pr-6">Descrição — {card.titulo}</b><button onClick={() => { salvar(); setDescBig(false); }} className="ml-auto text-muted hover:text-fg shrink-0" aria-label="Fechar"><X size={20} /></button></div>
              <textarea autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalhe a tarefa…" className="flex-1 w-full rounded-lg border border-line bg-surface text-fg px-3 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand/30" />
              <div className="mt-3 flex items-center gap-2"><Button onClick={() => { salvar(); setDescBig(false); }}>Salvar e fechar</Button><span className="text-xs text-muted">salva automaticamente ao fechar</span></div>
            </div>
          </div>
        )}

        {comentBig && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60" onClick={() => setComentBig(false)} />
            <div className="relative w-full max-w-2xl h-[82vh] bg-surface border border-line rounded-2xl shadow-xl p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2"><b className="text-fg text-base truncate pr-6 inline-flex items-center gap-1.5"><MessageSquare size={16} /> Comentários — {card.titulo}</b><button onClick={() => setComentBig(false)} className="ml-auto text-muted hover:text-fg shrink-0" aria-label="Fechar"><X size={20} /></button></div>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {(card.comentarios || []).length === 0 ? <div className="text-sm text-muted text-center py-10">Nenhum comentário ainda. Escreva o primeiro abaixo.</div> :
                  (card.comentarios || []).map((c: any) => (
                    <div key={c.id} className="text-sm bg-surface2/50 rounded-lg px-3 py-2">
                      <div className="text-xs text-muted mb-0.5"><b className="text-fg/80">{c.autor || "—"}</b>{c.created_at ? " · " + new Date(c.created_at).toLocaleString("pt-BR") : ""}</div>
                      <div className="text-fg whitespace-pre-wrap leading-relaxed">{c.texto}</div>
                    </div>
                  ))}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <textarea autoFocus value={novoComent} onChange={(e) => setNovoComent(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); comentar(); } }} rows={4} placeholder="Escrever um comentário… (Ctrl+Enter envia)" className="flex-1 rounded-lg border border-line bg-surface text-fg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30" />
                <Button className="h-10" onClick={comentar}>Enviar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
