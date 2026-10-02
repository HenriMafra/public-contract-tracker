"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import { baseName, download, pageCount } from "@/lib/tools/pdfutils";
import { Sparkles } from "lucide-react";

const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs";

async function loadPdfjs() {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; // sem CSP no projeto => CDN ok
  return pdfjs;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">{children}</div>;
}

export function PdfToJpg() {
  const [files, setFiles] = useState<File[]>([]);
  const [scale, setScale] = useState(2);     // 1=72dpi, 2≈144dpi, 3≈216dpi
  const [quality, setQuality] = useState(85);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);
  const [paginas, setPaginas] = useState(0);
  useEffect(() => {
    let a = true;
    if (files[0]) pageCount(files[0]).then((n) => { if (a) setPaginas(n); }).catch(() => setPaginas(0));
    else setPaginas(0);
    return () => { a = false; };
  }, [files]);

  async function run() {
    setStatus(null);
    if (!files[0]) { setStatus({ t: "Selecione um PDF.", ok: false }); return; }
    setBusy(true);
    try {
      const pdfjs = await loadPdfjs();
      const data = await files[0].arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      const n = doc.numPages;
      const base = baseName(files[0].name);
      const imgs: { name: string; arr: Uint8Array }[] = [];
      for (let i = 1; i <= n; i++) {
        setStatus({ t: `Renderizando página ${i}/${n}...`, ok: true });
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); // JPG não tem transparência
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), "image/jpeg", quality / 100));
        imgs.push({ name: `${base}_p${String(i).padStart(3, "0")}.jpg`, arr: new Uint8Array(await blob.arrayBuffer()) });
      }
      if (imgs.length === 1) {
        await download(new Blob([imgs[0].arr as any], { type: "image/jpeg" }), `${base}.jpg`, "image/jpeg");
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        imgs.forEach((im) => zip.file(im.name, im.arr));
        const content = await zip.generateAsync({ type: "blob" });
        await download(content, `${base}_imagens.zip`, "application/zip");
      }
      setStatus({ t: `Pronto! ${n} página(s) exportada(s)${n > 1 ? " (.zip)" : ""}.`, ok: true });
    } catch (e: any) {
      setStatus({ t: e?.message || "Erro ao converter o PDF.", ok: false });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <FileDrop accept=".pdf,application/pdf" multiple={false} files={files} setFiles={setFiles} hint="Um arquivo PDF · cada página vira um JPG (várias páginas saem em .zip)" />
      {paginas > 1 && <div className="text-sm rounded-lg px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400">Seu PDF tem <b>{paginas} páginas</b> → vão sair <b>{paginas} imagens dentro de um arquivo .zip</b> (você precisa extrair depois).</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Resolução</Label>
          <select value={scale} onChange={(e) => setScale(+e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value={1}>Padrão — tela/leitura (72 dpi)</option><option value={2}>Alta — boa p/ imprimir (144 dpi)</option><option value={3}>Máxima — arquivo grande (216 dpi)</option>
          </select>
        </div>
        <div>
          <Label>Qualidade JPG: {quality}%</Label>
          <input type="range" min={50} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full accent-brand" />
        </div>
      </div>
      {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy || !files.length}><Sparkles size={16} /> {busy ? "Convertendo..." : "Converter para JPG"}</Button>
        {files.length > 0 && <Button variant="ghost" onClick={() => { setFiles([]); setStatus(null); }}>Limpar</Button>}
      </div>
      <div className="text-xs text-muted">🔒 Renderizado no seu navegador — o PDF não é enviado a nenhum servidor.</div>
    </div>
  );
}
