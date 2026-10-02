import { cn } from "@/lib/utils/format";

// Avatar de iniciais para órgãos (identificador visual, já que logo real não existe).
// Tons SUAVES alinhados ao tema (baixa saturação), determinístico por nome — discreto,
// não polui nem destoa das cores da página.
const PAL = [
  "bg-gradient-to-br from-brand/20 to-brand/5 text-brand ring-1 ring-inset ring-brand/25",
  "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/25",
  "bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25",
  "bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/25",
  "bg-gradient-to-br from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/25",
  "bg-gradient-to-br from-slate-500/20 to-slate-500/5 text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/25",
];
const STOP = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na", "a", "o", "-"]);

function iniciais(nome: string) {
  const ws = String(nome || "").trim().split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  if (!ws.length) return "—";
  if (ws.length === 1) return ws[0].slice(0, 2).toUpperCase();
  return (ws[0][0] + ws[ws.length - 1][0]).toUpperCase();
}
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

export function OrgAvatar({ name, sigla, size = 40 }: { name?: string; sigla?: string | null; size?: number }) {
  const nome = name || "—";
  const cor = PAL[hash(nome) % PAL.length];
  // Usa a sigla pública do órgão (coluna `sigla`) quando houver; senão, iniciais.
  const txt = (sigla && sigla.trim()) ? sigla.trim() : iniciais(nome);
  const fs = Math.max(9, Math.round(size * (txt.length >= 5 ? 0.24 : txt.length >= 4 ? 0.28 : 0.34)));
  return (
    <div className={cn("rounded-lg grid place-items-center font-bold shrink-0 select-none px-0.5", cor)}
      style={{ width: size, height: size, fontSize: fs }} title={nome} aria-hidden>
      {txt}
    </div>
  );
}
