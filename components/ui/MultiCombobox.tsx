"use client";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn, semAcento } from "@/lib/utils/format";

/** Filtro de MÚLTIPLA seleção: o botão mostra o resumo; clicar abre uma janela
 *  onde a pessoa pesquisa, marca vários, e confirma. Retorna string[]. */
export function MultiCombobox({ value, onChange, options, label, allLabel, className, allowCustom = false, onSuggest }: {
  value: string[]; onChange: (v: string[]) => void; options: string[]; label: string; allLabel: string; className?: string;
  allowCustom?: boolean; onSuggest?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [q, setQ] = useState("");
  function abrir() { setDraft(value); setQ(""); setOpen(true); }
  function toggle(o: string) { setDraft((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o])); }
  const filt = useMemo(() => { const nq = semAcento(q); return (nq ? options.filter((o) => semAcento(o).includes(nq)) : options).slice(0, 600); }, [q, options]);
  const resumo = value.length === 0 ? allLabel : value.length === 1 ? value[0] : `${value.length} selecionados`;

  return (
    <div className={cn("relative", className)}>
      <button type="button" onClick={abrir}
        className="h-9 w-full rounded-lg border border-line bg-surface text-fg pl-2.5 pr-2 text-sm flex items-center gap-1 hover:bg-surface2 focus:outline-none focus:ring-2 focus:ring-brand/30">
        <span className={cn("truncate flex-1 text-left", value.length ? "text-fg font-medium" : "text-muted")}>{resumo}</span>
        {value.length > 0 && <span className="text-[10px] font-bold bg-brand text-white rounded-full px-1.5 py-0.5 shrink-0">{value.length}</span>}
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {open && typeof document !== "undefined" && createPortal((
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-surface border border-line rounded-2xl shadow-xl p-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center gap-2 mb-2">
              <b className="text-fg">{label}</b><span className="text-xs text-muted">— marque um ou mais</span>
              <button onClick={() => setOpen(false)} className="ml-auto text-muted hover:text-fg" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="pesquisar…" className="h-9 w-full pl-8 pr-2 rounded-lg border border-line bg-surface text-fg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div className="flex items-center gap-3 mb-2 text-xs">
              <button onClick={() => setDraft((d) => Array.from(new Set([...d, ...filt])))} className="text-brand hover:underline font-semibold">+ marcar os {filt.length} da busca</button>
              <button onClick={() => setDraft([])} className="text-muted hover:text-fg">limpar seleção</button>
              <span className="ml-auto text-muted"><b className="text-fg">{draft.length}</b> selecionado(s)</span>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-line divide-y divide-line min-h-[120px]">
              {/* valores custom já adicionados (não estão na lista oficial) — para poder desmarcar */}
              {draft.filter((d) => !options.some((o) => o === d)).map((d) => (
                <label key={"c-" + d} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 cursor-pointer bg-brand/5">
                  <input type="checkbox" checked onChange={() => toggle(d)} className="h-4 w-4 accent-brand shrink-0" />
                  <span className="truncate text-fg">{d} <span className="text-[10px] text-brand font-semibold">(novo)</span></span>
                </label>
              ))}
              {filt.map((o) => (
                <label key={o} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface2 cursor-pointer">
                  <input type="checkbox" checked={draft.includes(o)} onChange={() => toggle(o)} className="h-4 w-4 accent-brand shrink-0" />
                  <span className="truncate text-fg">{o}</span>
                </label>
              ))}
              {allowCustom && q.trim() && !options.some((o) => semAcento(o) === semAcento(q)) && !draft.some((d) => semAcento(d) === semAcento(q)) && (
                <button type="button" onClick={() => { const v = q.trim(); setDraft((d) => [...d, v]); onSuggest?.(v); setQ(""); }}
                  className="w-full text-left px-3 py-2 text-sm text-brand hover:bg-surface2 font-semibold">
                  ➕ Não está na lista — adicionar “{q.trim()}”{onSuggest ? " e sugerir à equipe" : ""}
                </button>
              )}
              {filt.length === 0 && !(allowCustom && q.trim()) && <div className="p-3 text-xs text-muted text-center">nada encontrado</div>}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button onClick={() => { onChange(draft); setOpen(false); }}>Confirmar{draft.length ? ` (${draft.length})` : ""}</Button>
              <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-fg px-3">cancelar</button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
