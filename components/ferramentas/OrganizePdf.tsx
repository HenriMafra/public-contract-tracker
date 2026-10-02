"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import { usePdfThumbs } from "./PdfThumbs";
import { extractPages, baseName, download } from "@/lib/tools/pdfutils";
import { cn } from "@/lib/utils/format";
import { Sparkles, X, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

/** Organizar PDF — pré-visualiza as páginas, reordena (arrastar ou setas) e exclui. */
export function OrganizePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const { thumbs, total, loading, error, progress } = usePdfThumbs(file, 0.5);
  const [order, setOrder] = useState<number[]>([]); // páginas (1-based) na ordem desejada
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [hist, setHist] = useState<number[][]>([]);

  useEffect(() => { setOrder(total ? Array.from({ length: total }, (_, i) => i + 1) : []); setStatus(null); setHist([]); }, [total]);

  const thumbByPage = useMemo(() => Object.fromEntries(thumbs.map((t) => [t.page, t])), [thumbs]);

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    setHist((h) => [...h, order]);
    setOrder((o) => { const n = [...o]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });
  }
  const remove = (page: number) => { setHist((h) => [...h, order]); setOrder((o) => o.filter((p) => p !== page)); };
  const reset = () => { setHist([]); setOrder(total ? Array.from({ length: total }, (_, i) => i + 1) : []); };
  const desfazer = () => setHist((h) => { if (!h.length) return h; setOrder(h[h.length - 1]); return h.slice(0, -1); });

  async function run() {
    if (!file) return;
    if (!order.length) { setStatus({ t: "Não sobrou nenhuma página. Restaure a ordem ou adicione páginas.", ok: false }); return; }
    setBusy(true); setStatus(null);
    try {
      const bytes = await extractPages(file, order.map((p) => p - 1));
      await download(bytes, `${baseName(file.name)}_organizado.pdf`);
      setStatus({ t: `Pronto! PDF gerado com ${order.length} página(s) na nova ordem.`, ok: true });
    } catch (e: any) { setStatus({ t: e?.message || "Erro ao gerar o PDF.", ok: false }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <FileDrop accept=".pdf,application/pdf" multiple={false} files={files} setFiles={setFiles}
        hint="Um PDF · arraste as páginas para reordenar, X para excluir" />
      {file && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-muted">
              {loading ? `Pré-visualizando… ${progress}/${total}` : `${order.length} de ${total} página(s) · arraste para reordenar`}
            </div>
            <div className="flex items-center gap-2">
              {hist.length > 0 && !loading && <Button variant="ghost" onClick={desfazer} disabled={busy}><RotateCcw size={14} /> Desfazer</Button>}
              {order.length !== total && !loading && <Button variant="ghost" onClick={reset} disabled={busy}>Restaurar todas</Button>}
            </div>
          </div>
          {error && <div className="text-sm rounded-lg px-3 py-2 bg-red-500/15 text-red-600 dark:text-red-400">{error}</div>}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {order.map((page, pos) => {
              const t = thumbByPage[page];
              return (
                <div key={page} draggable
                  onDragStart={() => setDragPos(pos)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragPos !== null) move(dragPos, pos); setDragPos(null); }}
                  onDragEnd={() => setDragPos(null)}
                  className={cn("group relative rounded-lg border overflow-hidden cursor-move transition", dragPos === pos ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-brand")}>
                  <div className="aspect-[3/4] grid place-items-center bg-white">
                    {t ? <img src={t.url} alt={`página ${page}`} className="w-full h-full object-contain" draggable={false} /> : <div className="text-xs text-muted animate-pulse">…</div>}
                  </div>
                  <div className="absolute top-1 left-1 text-xs font-bold bg-black/65 text-white rounded px-1.5 py-0.5">{pos + 1}</div>
                  <button onClick={() => remove(page)} title="Excluir esta página"
                    className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 transition hover:bg-red-700"><X size={12} /></button>
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-black/55 px-1 py-0.5 transition">
                    <button onClick={() => move(pos, pos - 1)} disabled={pos === 0} className="text-white disabled:opacity-30" title="Mover para a esquerda"><ArrowLeft size={13} /></button>
                    <span className="text-xs text-white/90">pág. {page}</span>
                    <button onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1} className="text-white disabled:opacity-30" title="Mover para a direita"><ArrowRight size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}
          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={busy || !order.length || loading}><Sparkles size={16} /> {busy ? "Gerando…" : "Gerar PDF organizado"}</Button>
            <Button variant="ghost" onClick={() => { setFiles([]); setStatus(null); }}>Limpar</Button>
          </div>
          <div className="text-xs text-muted">🔒 Tudo acontece no seu navegador — o arquivo não é enviado a nenhum servidor.</div>
        </>
      )}
    </div>
  );
}
