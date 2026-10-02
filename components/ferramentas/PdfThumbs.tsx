"use client";
import { useEffect, useRef, useState } from "react";

// Mesmo worker usado no PDF→JPG (sem CSP no projeto, CDN ok).
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs";
async function loadPdfjs() {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return pdfjs;
}

export type Thumb = { page: number; url: string; w: number; h: number };

/** Renderiza miniaturas de cada página de um PDF, 100% no navegador (pdf.js).
 *  Incremental (as miniaturas aparecem conforme renderizam) e cancelável ao trocar de arquivo. */
export function usePdfThumbs(file: File | null, scale = 0.5) {
  const [thumbs, setThumbs] = useState<Thumb[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    const my = ++reqId.current;
    setThumbs([]); setTotal(0); setError(""); setProgress(0);
    if (!file) return;
    setLoading(true);
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const data = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (my !== reqId.current) return;
        setTotal(doc.numPages);
        const out: Thumb[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (my !== reqId.current) return; // arquivo trocou / desmontou → aborta
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (my !== reqId.current) return;
          out.push({ page: i, url: canvas.toDataURL("image/jpeg", 0.7), w: canvas.width, h: canvas.height });
          setThumbs([...out]); setProgress(i);
        }
      } catch (e: any) {
        if (my === reqId.current) setError(e?.message || "Não foi possível pré-visualizar este PDF.");
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    })();
    return () => { reqId.current++; };
  }, [file, scale]);

  return { thumbs, total, loading, error, progress };
}
