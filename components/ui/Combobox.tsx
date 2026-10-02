"use client";
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn, semAcento } from "@/lib/utils/format";

/**
 * Filtro digitável (combobox): mostra a opção atual, abre uma lista com CAMPO DE BUSCA
 * para digitar e filtrar. Use no lugar de <Select> quando há muitas opções (órgão, solução…).
 */
export function Combobox({
  value, onChange, options, allLabel = "Todas", className, allowCustom = false, onSuggest,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel?: string;
  className?: string;
  allowCustom?: boolean;            // permite usar um valor digitado que não está na lista
  onSuggest?: (v: string) => void;  // ao criar um valor custom, também sugere incluí-lo na lista
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", esc); };
  }, [open]);

  const filt = useMemo(() => {
    const nq = semAcento(q);
    const base = nq ? options.filter((o) => semAcento(o).includes(nq)) : options;
    return base.slice(0, 300);
  }, [q, options]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button type="button" onClick={() => { setOpen((o) => !o); setQ(""); }}
        className="h-9 w-full rounded-lg border border-line bg-surface text-fg pl-2.5 pr-2 text-sm flex items-center gap-1 hover:bg-surface2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand">
        <span className={cn("truncate flex-1 text-left", value ? "" : "text-muted")}>{value || allLabel}</span>
        {value && <X size={14} className="text-muted hover:text-fg shrink-0" onClick={(e) => { e.stopPropagation(); onChange(""); }} />}
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 left-0 right-0 min-w-[230px] bg-surface border border-line rounded-lg shadow-xl">
          <div className="p-1.5 border-b border-line relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="digite para filtrar…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filt.length > 0) {
                    onChange(filt[0]);
                    setOpen(false);
                  } else if (allowCustom && q.trim()) {
                    const v = q.trim();
                    onChange(v);
                    setOpen(false);
                    onSuggest?.(v);
                  }
                }
              }}
              className="h-8 w-full rounded-md border border-line bg-surface text-fg pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div className="max-h-64 overflow-auto py-1">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-surface2", value ? "text-muted" : "text-brand font-semibold")}>{allLabel}</button>
            {filt.map((o) => (
              <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-surface2 truncate", o === value ? "text-brand font-semibold" : "text-fg")} title={o}>{o}</button>
            ))}
            {allowCustom && q.trim() && !options.some((o) => semAcento(o) === semAcento(q)) && (
              <button type="button" onClick={() => { const v = q.trim(); onChange(v); setOpen(false); onSuggest?.(v); }}
                className="w-full text-left px-3 py-2 text-sm text-brand hover:bg-surface2 border-t border-line font-semibold">
                ➕ Não está na lista — usar “{q.trim()}”{onSuggest ? " e sugerir à equipe" : ""}
              </button>
            )}
            {filt.length === 0 && !(allowCustom && q.trim()) && <div className="px-3 py-3 text-xs text-muted text-center">nada encontrado</div>}
          </div>
        </div>
      )}
    </div>
  );
}
