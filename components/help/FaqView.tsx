"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { FAQ, FAQ_CATS } from "@/lib/help/faq";
import {
  Search, ChevronRight, ChevronDown, ArrowRight, PlayCircle, MessagesSquare, BookOpen,
  Rocket, Swords, ClipboardCheck, Star, Handshake, KanbanSquare, Gavel, FileText, UserRound, Database, Wrench,
} from "lucide-react";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const CAT_ICON: Record<string, any> = {
  "Começar": Rocket, "Lista de Ataque": Swords, "Decisões": ClipboardCheck, "Meus órgãos & acesso": Star,
  "Registro de Oportunidade (RO)": Handshake, "Backlog": KanbanSquare, "Licitações": Gavel,
  "Relatórios & exportação": FileText, "Conta & aparência": UserRound, "Dados & atualização": Database, "Ferramentas": Wrench,
};

export function FaqView() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");   // categoria aberta (acordeão — uma por vez)
  const [qa, setQa] = useState<string>("");      // pergunta aberta
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

  const refazerTour = () => { try { window.dispatchEvent(new Event("mapper:tour")); } catch {} };

  const Resposta = ({ f }: { f: typeof FAQ[number] }) => (
    <div className="px-4 pb-4 pt-3 mt-1 border-t border-line text-sm text-muted leading-relaxed">
      <p>{f.a}</p>
      {f.href && <Link href={f.href} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand hover:underline">{f.hrefLabel || "Abrir"} <ArrowRight size={12} /></Link>}
      {f.tour && <button onClick={refazerTour} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand hover:underline"><PlayCircle size={13} /> Iniciar o tutorial</button>}
    </div>
  );
  const Pergunta = ({ f }: { f: typeof FAQ[number] }) => {
    const on = qa === f.q;
    return (
      <div className="rounded-lg border border-line bg-surface">
        <button onClick={() => setQa(on ? "" : f.q)} className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm font-medium text-fg hover:bg-surface2 rounded-lg">
          <span className="flex-1">{f.q}</span>
          <ChevronDown size={15} className={"text-muted transition-transform shrink-0 " + (on ? "rotate-180" : "")} />
        </button>
        {on && <Resposta f={f} />}
      </div>
    );
  };

  return (
    <div className="space-y-3 max-w-2xl">
      {/* busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setQa(""); }} placeholder="Buscar uma dúvida… (ex.: PDF, decisão, meus órgãos, RO)"
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-line bg-surface text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
      </div>

      {buscando ? (
        resultados.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-sm text-muted text-center">Nada encontrado para “{q}”. Tente outra palavra — ou mande sua pergunta em <Link href="/feedback" className="text-brand font-semibold hover:underline">Sugestões &amp; Bugs</Link>.</div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-xs text-muted px-1">{resultados.length} resultado(s)</div>
            {resultados.map((f) => <div key={f.q}><div className="text-[10px] uppercase tracking-wide text-brand/80 font-bold px-1">{f.cat}</div><Pergunta f={f} /></div>)}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {FAQ_CATS.map((c) => {
            const Icon = CAT_ICON[c] || BookOpen; const on = cat === c;
            return (
              <div key={c} className="rounded-xl border border-line overflow-hidden">
                <button onClick={() => { setCat(on ? "" : c); setQa(""); }}
                  className={"w-full flex items-center gap-3 px-4 py-3 text-left transition " + (on ? "bg-brand/5" : "bg-surface hover:bg-surface2")}>
                  <span className={"inline-grid place-items-center w-8 h-8 rounded-lg shrink-0 " + (on ? "bg-brand text-white" : "bg-brand/10 text-brand")}><Icon size={16} /></span>
                  <span className="flex-1 font-semibold text-fg">{c}</span>
                  <span className="text-xs text-muted">{countCat[c] || 0}</span>
                  <ChevronRight size={16} className={"text-muted transition-transform " + (on ? "rotate-90" : "")} />
                </button>
                {on && <div className="p-2 pt-0 space-y-1.5 bg-brand/5">{FAQ.filter((f) => f.cat === c).map((f) => <Pergunta key={f.q} f={f} />)}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface2/40 p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-fg inline-flex items-center gap-2"><MessagesSquare size={16} className="text-brand" /> Não encontrou?</div>
        <Link href="/feedback" className="text-sm font-semibold text-brand hover:underline">Mandar pergunta em Sugestões &amp; Bugs →</Link>
      </div>
    </div>
  );
}
