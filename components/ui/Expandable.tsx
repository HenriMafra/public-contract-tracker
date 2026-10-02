"use client";
import * as React from "react";
import { useEffect, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

/**
 * Envolve uma lista/tabela e oferece um botão "Tela cheia" que abre o conteúdo
 * ocupando a tela inteira (com os filtros junto). Fecha no botão, no X ou com ESC.
 */
export function Expandable({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [full]);

  return (
    <div className={full ? "fixed inset-0 z-50 bg-bg flex flex-col" : "relative " + className}>
      {/* barra de ações */}
      <div className={"flex items-center gap-2 " + (full ? "px-4 sm:px-6 h-14 border-b border-line shrink-0" : "justify-end mb-2")}>
        {full && <span className="mr-auto font-extrabold text-fg text-base sm:text-lg truncate">{title || "Tela cheia"}</span>}
        <button
          type="button"
          onClick={() => setFull((f) => !f)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold bg-surface border border-line text-fg hover:bg-surface2 transition"
          title={full ? "Sair da tela cheia (ESC)" : "Abrir em tela cheia"}
        >
          {full ? <><Minimize2 size={15} /> Sair da tela cheia</> : <><Maximize2 size={15} /> Tela cheia</>}
        </button>
        {full && (
          <button type="button" onClick={() => setFull(false)} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-surface2 text-muted hover:text-fg" aria-label="Fechar">
            <X size={18} />
          </button>
        )}
      </div>

      <div className={full ? "flex-1 overflow-auto p-4 sm:p-6" : ""}>{children}</div>
    </div>
  );
}
