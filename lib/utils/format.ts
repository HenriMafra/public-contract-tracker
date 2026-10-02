export function brl(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (n == null || isNaN(n as number)) return "—";
  return "R$ " + (n as number).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
export function brlMi(v: number | null | undefined): string {
  const n = Number(v || 0);
  if (n >= 1e9) return "R$ " + (n / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " bi";
  if (n >= 1e6) return "R$ " + (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
  return brl(n);
}
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString("pt-BR");
}
export function cn(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(" ");
}
/** Normaliza texto para busca: sem acento, sem caixa, sem espaços nas pontas.
 *  Use em TODO campo de busca para "sao paulo" achar "São Paulo". */
export function semAcento(s: any): string {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
// Badges tonais (calmos, legíveis no claro e no escuro) — ring sutil em vez de fundo sólido berrante.
export function corPrioridade(p?: string): string {
  const m: Record<string, string> = {
    "Ataque máximo": "bg-red-500/20 text-red-700 dark:text-red-300 ring-1 ring-red-500/30",
    "Prioridade crítica": "bg-red-500/15 text-red-700 dark:text-red-300",
    "Alta prioridade": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "Média prioridade": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    "Monitoramento": "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    "Baixa / revisão": "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  };
  return m[p || ""] || "bg-slate-500/15 text-slate-600 dark:text-slate-300";
}
export function corUrgencia(u?: string): string {
  const m: Record<string, string> = {
    "Crítica": "bg-red-500/15 text-red-700 dark:text-red-300",
    "Alta": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "Média": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    "Baixa": "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    "Revisão": "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  };
  return m[u || ""] || "bg-slate-500/15 text-slate-600 dark:text-slate-300";
}
