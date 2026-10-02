"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/format";
import { TEMAS, TEMA_PADRAO } from "@/lib/themes";

export function ThemePicker() {
  const [atual, setAtual] = useState(TEMA_PADRAO);
  useEffect(() => {
    try { setAtual(localStorage.getItem("atlas-tema-cor") || TEMA_PADRAO); } catch {}
  }, []);
  function escolher(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    try { localStorage.setItem("atlas-tema-cor", id); } catch {}
    setAtual(id);
  }
  const grupos = Array.from(new Set(TEMAS.map((t) => t.grupo)));
  return (
    <div className="space-y-4">
      {grupos.map((g) => (
        <div key={g}>
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-2">{g}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {TEMAS.filter((t) => t.grupo === g).map((t) => (
              <button key={t.id} onClick={() => escolher(t.id)} title={t.label}
                className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition text-left",
                  atual === t.id ? "border-brand bg-brand/10 font-semibold text-fg" : "border-line bg-surface hover:bg-surface2 text-fg")}>
                <span className="w-5 h-5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10" style={{ background: t.sw }} />
                <span className="truncate flex-1">{t.label}</span>
                {atual === t.id && <Check size={15} className="text-brand shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">A cor do tema fica salva neste navegador. O modo claro/escuro continua no botão ☀️/🌙 do topo — eles se combinam.</p>
    </div>
  );
}
