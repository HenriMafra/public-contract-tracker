"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { FAQ, FAQ_CATS } from "@/lib/help/faq";
import {
  LifeBuoy, X, Search, ChevronRight, ChevronDown, PlayCircle, ArrowRight,
  Rocket, Swords, ClipboardCheck, Star, Handshake, KanbanSquare, Gavel, FileText, UserRound, Database, Wrench, BookOpen,
} from "lucide-react";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const CAT_ICON: Record<string, any> = {
  "Começar": Rocket, "Lista de Ataque": Swords, "Decisões": ClipboardCheck, "Meus órgãos & acesso": Star,
  "Registro de Oportunidade (RO)": Handshake, "Backlog": KanbanSquare, "Licitações": Gavel,
  "Relatórios & exportação": FileText, "Conta & aparência": UserRound, "Dados & atualização": Database, "Ferramentas": Wrench,
};

export function HelpBot() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [qa, setQa] = useState<string>("");

  const buscando = q.trim().length > 0;
  const resultados = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return [];
    return FAQ.filter((f) => norm(f.q).includes(nq) || norm(f.cat).includes(nq) || norm(f.a).includes(nq));
  }, [q]);
  const countCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of FAQ) m[f.cat] = (m[f.cat] || 0) + 1;
    return m;
  }, []);

  const refazerTour = () => { try { window.dispatchEvent(new Event("mapper:tour")); } catch {} setOpen(false); };

  const Resposta = ({ f }: { f: typeof FAQ[number] }) => (
    <div className="px-3 pb-3 pt-2.5 mt-1 border-t border-line text-[13px] text-muted leading-relaxed">
      <p>{f.a}</p>
      {f.href && <Link href={f.href} onClick={() => setOpen(false)} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand hover:underline">{f.hrefLabel || "Abrir"} <ArrowRight size={12} /></Link>}
      {f.tour && <button onClick={refazerTour} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand hover:underline"><PlayCircle size={13} /> Iniciar o tutorial</button>}
    </div>
  );
  const Pergunta = ({ f }: { f: typeof FAQ[number] }) => {
    const on = qa === f.q;
    return (
      <div className="rounded-lg border border-line bg-surface">
        <button onClick={() => setQa(on ? "" : f.q)} className="w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] font-medium text-fg hover:bg-surface2 rounded-lg">
          <span className="flex-1">{f.q}</span>
          <ChevronDown size={14} className={"text-muted transition-transform shrink-0 " + (on ? "rotate-180" : "")} />
        </button>
        {on && <Resposta f={f} />}
      </div>
    );
  };

  return (
    <>
      {/* botão flutuante */}
      <button onClick={() => setOpen((o) => !o)} title="Central de ajuda" aria-label="Central de ajuda"
        className="no-print fixed bottom-4 right-4 z-[70] inline-flex items-center gap-2 rounded-full bg-brand text-white pl-3.5 pr-4 py-2.5 shadow-lg ring-1 ring-black/5 hover:bg-brand-600 hover:shadow-xl transition">
        {open ? <X size={18} /> : <LifeBuoy size={18} />}
        <span className="text-sm font-bold hidden sm:inline">{open ? "Fechar" : "Ajuda"}</span>
      </button>

      {open && (
        <div className="no-print fixed bottom-20 right-4 z-[70] w-[calc(100vw-2rem)] sm:w-[420px] max-h-[74vh] bg-surface border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* header */}
          <div className="p-4 bg-gradient-to-br from-brand to-brand-600 text-white">
            <div className="flex items-center gap-2.5">
              <span className="inline-grid place-items-center w-9 h-9 rounded-xl bg-white/20"><LifeBuoy size={18} /></span>
              <div className="flex-1"><div className="font-bold leading-tight">Central de Ajuda</div><div className="text-[11px] text-white/80">Respostas rápidas, sem sair da tela.</div></div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setQa(""); }} placeholder="Buscar dúvida (ex.: PDF, decisão, órgãos)…"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/95 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/60" />
            </div>
          </div>

          {/* corpo */}
          <div className="flex-1 overflow-y-auto p-2.5">
            {buscando ? (
              resultados.length === 0
                ? <div className="text-sm text-muted text-center py-8 px-3">Nada encontrado para “{q}”. Tente outra palavra — ou mande sua pergunta em <b>Sugestões &amp; Bugs</b>.</div>
                : <div className="space-y-1.5">
                    <div className="text-[11px] text-muted px-1">{resultados.length} resultado(s)</div>
                    {resultados.map((f) => <div key={f.q}><div className="text-[10px] uppercase tracking-wide text-brand/80 font-bold px-1">{f.cat}</div><Pergunta f={f} /></div>)}
                  </div>
            ) : (
              <div className="space-y-1.5">
                {FAQ_CATS.map((c) => {
                  const Icon = CAT_ICON[c] || BookOpen; const on = cat === c;
                  return (
                    <div key={c} className="rounded-xl border border-line overflow-hidden">
                      <button onClick={() => { setCat(on ? "" : c); setQa(""); }}
                        className={"w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition " + (on ? "bg-brand/5" : "bg-surface hover:bg-surface2")}>
                        <span className={"inline-grid place-items-center w-7 h-7 rounded-lg shrink-0 " + (on ? "bg-brand text-white" : "bg-brand/10 text-brand")}><Icon size={15} /></span>
                        <span className="flex-1 text-sm font-semibold text-fg">{c}</span>
                        <span className="text-[11px] text-muted">{countCat[c] || 0}</span>
                        <ChevronRight size={15} className={"text-muted transition-transform " + (on ? "rotate-90" : "")} />
                      </button>
                      {on && <div className="p-2 pt-0 space-y-1 bg-brand/5">{FAQ.filter((f) => f.cat === c).map((f) => <Pergunta key={f.q} f={f} />)}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* rodapé */}
          <div className="p-2.5 border-t border-line flex items-center justify-between gap-2 bg-surface2/40">
            <Link href="/faq" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs font-semibold text-fg hover:text-brand"><BookOpen size={13} /> Ver todas (FAQ)</Link>
            <Link href="/feedback" onClick={() => setOpen(false)} className="text-xs font-semibold text-brand hover:underline">Não achou? Perguntar →</Link>
          </div>
        </div>
      )}
    </>
  );
}
