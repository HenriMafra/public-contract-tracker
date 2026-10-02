"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import { baseName, download, pageCount as pdfPageCount } from "@/lib/tools/pdfutils";
import { Sparkles, Eraser } from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">{children}</div>;
}
const POS_LABEL: Record<string, string> = {
  "bottom-right": "rodapé direita", "bottom-left": "rodapé esquerda", "bottom-center": "rodapé centro",
  "top-right": "topo direita", "top-left": "topo esquerda",
};

/** Assinar PDF — desenhe a assinatura e aplique numa página. 100% no navegador. */
export function SignPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);
  const [paginas, setPaginas] = useState(1);
  const [page, setPage] = useState(1);
  const [pos, setPos] = useState("bottom-right");
  const [size, setSize] = useState(180);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    if (file) pdfPageCount(file).then((n) => { if (alive) { setPaginas(n); setPage(1); } }).catch(() => {});
    else { setPaginas(1); setPage(1); }
    return () => { alive = false; };
  }, [file]);

  function ctx() { return canvasRef.current!.getContext("2d")!; }
  function pt(e: React.PointerEvent) {
    const c = canvasRef.current!, r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function down(e: React.PointerEvent) {
    drawing.current = true; const g = ctx(); g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#0f172a";
    const { x, y } = pt(e); g.beginPath(); g.moveTo(x, y); (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent) { if (!drawing.current) return; const { x, y } = pt(e); const g = ctx(); g.lineTo(x, y); g.stroke(); setHasSig(true); }
  function up() { drawing.current = false; }
  function limpar() { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setHasSig(false); }

  async function run() {
    if (!file) { setStatus({ t: "Selecione um PDF.", ok: false }); return; }
    if (!hasSig) { setStatus({ t: "Desenhe sua assinatura no quadro primeiro.", ok: false }); return; }
    setBusy(true); setStatus(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      const bin = Uint8Array.from(atob(dataUrl.split(",")[1]), (ch) => ch.charCodeAt(0));
      const img = await doc.embedPng(bin);
      const pages = doc.getPages();
      const idx = Math.min(Math.max(1, page), pages.length) - 1;
      const pg = pages[idx];
      const { width, height } = pg.getSize();
      const w = size, h = size * (img.height / img.width), margin = 28;
      let x = margin, y = margin;
      if (pos.includes("right")) x = width - w - margin;
      if (pos.includes("center")) x = (width - w) / 2;
      if (pos.includes("top")) y = height - h - margin;
      pg.drawImage(img, { x, y, width: w, height: h });
      await download(await doc.save(), `${baseName(file.name)}_assinado.pdf`);
      setStatus({ t: `Pronto! Assinatura aplicada na página ${idx + 1}.`, ok: true });
    } catch (e: any) { setStatus({ t: e?.message || "Erro ao assinar o PDF.", ok: false }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <FileDrop accept=".pdf,application/pdf" multiple={false} files={files} setFiles={setFiles} hint="Um PDF · você desenha a assinatura abaixo e escolhe onde aplicar" />

      <div>
        <Label>Desenhe sua assinatura</Label>
        <div className="rounded-lg border border-line bg-white relative">
          <canvas ref={canvasRef} width={640} height={200} className="w-full h-[160px] rounded-lg cursor-crosshair"
            style={{ touchAction: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
          {!hasSig && <span className="absolute inset-0 grid place-items-center text-sm text-slate-400 pointer-events-none">assine aqui com o mouse ou o dedo</span>}
        </div>
        <button onClick={limpar} className="mt-1.5 text-xs text-muted hover:text-fg inline-flex items-center gap-1"><Eraser size={13} /> limpar assinatura</button>
      </div>

      {file && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Aplicar na página</Label>
            <select value={page} onChange={(e) => setPage(+e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Página {n}{n === 1 ? " (primeira)" : n === paginas ? " (última)" : ""}</option>)}
            </select>
          </div>
          <div>
            <Label>Posição</Label>
            <select value={pos} onChange={(e) => setPos(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value="bottom-right">Rodapé direita</option><option value="bottom-left">Rodapé esquerda</option><option value="bottom-center">Rodapé centro</option>
              <option value="top-right">Topo direita</option><option value="top-left">Topo esquerda</option>
            </select>
          </div>
          <div>
            <Label>Tamanho: {size}px</Label>
            <input type="range" min={100} max={300} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full accent-brand mt-2" />
          </div>
        </div>
      )}

      {file && hasSig && <div className="text-sm text-brand bg-brand/10 rounded-lg px-3 py-2">A assinatura será colocada na <b>página {page}</b>{paginas > 1 ? ` de ${paginas}` : ""}, no <b>{POS_LABEL[pos] || pos}</b>. Confira antes de baixar.</div>}
      {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy || !file || !hasSig}><Sparkles size={16} /> {busy ? "Assinando…" : "Assinar e baixar"}</Button>
        {file && <Button variant="ghost" onClick={() => { setFiles([]); setStatus(null); }}>Limpar tudo</Button>}
      </div>
      <div className="text-xs text-muted">🔒 Tudo acontece no seu navegador — o arquivo não é enviado a nenhum servidor.</div>
    </div>
  );
}
