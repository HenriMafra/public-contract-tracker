"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Paginação simples (cliente): mostra um intervalo por página, com Anterior/Próxima + números.
 *  Deixa o navegador renderizar só uma página por vez (rápido, mesmo com milhares de linhas). */
export function Paginator({ page, setPage, total, perPage }: { page: number; setPage: (n: number) => void; total: number; perPage: number }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const go = (n: number) => setPage(Math.min(pages, Math.max(1, n)));
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const win: number[] = [];
  for (let i = start; i <= end; i++) win.push(i);
  const ini = (page - 1) * perPage + 1;
  const fim = Math.min(page * perPage, total);
  const btn = "h-8 min-w-[2rem] px-2 rounded-lg border border-line text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 py-3">
      <span className="text-xs text-muted mr-2">{ini.toLocaleString("pt-BR")}–{fim.toLocaleString("pt-BR")} de <b className="text-fg">{total.toLocaleString("pt-BR")}</b></span>
      <button className={btn + " hover:bg-surface2"} onClick={() => go(1)} disabled={page === 1} title="Primeira página">«</button>
      <button className={btn + " hover:bg-surface2 inline-flex items-center"} onClick={() => go(page - 1)} disabled={page === 1} title="Anterior"><ChevronLeft size={15} /></button>
      {start > 1 && <span className="text-muted px-1">…</span>}
      {win.map((n) => (
        <button key={n} onClick={() => go(n)} className={btn + (n === page ? " bg-brand text-white border-brand" : " hover:bg-surface2 text-fg")}>{n}</button>
      ))}
      {end < pages && <span className="text-muted px-1">…</span>}
      <button className={btn + " hover:bg-surface2 inline-flex items-center"} onClick={() => go(page + 1)} disabled={page === pages} title="Próxima"><ChevronRight size={15} /></button>
      <button className={btn + " hover:bg-surface2"} onClick={() => go(pages)} disabled={page === pages} title="Última página">»</button>
    </div>
  );
}
