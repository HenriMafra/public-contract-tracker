"use client";
import { useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import { usePdfThumbs } from "./PdfThumbs";
import { cropPdf, baseName, download } from "@/lib/tools/pdfutils";
import { Sparkles } from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">{children}</div>;
}

/** Recortar PDF — apara as margens (em %) de todas as páginas. 100% no navegador. */
export function CropPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const { thumbs, total, loading, progress } = usePdfThumbs(file, 0.5);
  const [m, setM] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);

  const setSide = (k: keyof typeof m) => (e: any) => setM((s) => ({ ...s, [k]: Math.min(45, Math.max(0, Number(e.target.value) || 0)) }));

  async function run() {
    if (!file) { setStatus({ t: "Selecione um PDF.", ok: false }); return; }
    setBusy(true); setStatus(null);
    try {
      const bytes = await cropPdf(file, m);
      await download(bytes, `${baseName(file.name)}_recortado.pdf`);
      setStatus({ t: "Pronto! PDF recortado gerado.", ok: true });
    } catch (e: any) { setStatus({ t: e?.message || "Erro ao recortar.", ok: false }); }
    finally { setBusy(false); }
  }

  // overlay visual da área que será mantida (sobre a 1ª miniatura)
  const inset = { top: `${m.top}%`, bottom: `${m.bottom}%`, left: `${m.left}%`, right: `${m.right}%` };
  const keptW = Math.max(0, 100 - m.left - m.right), keptH = Math.max(0, 100 - m.top - m.bottom);
  const keptPct = Math.round((keptW * keptH) / 100);
  const cortaMuito = keptPct > 0 && keptPct < 30;

  return (
    <div className="space-y-4">
      <FileDrop accept=".pdf,application/pdf" multiple={false} files={files} setFiles={setFiles} hint="Um PDF · as margens informadas serão aparadas em todas as páginas" />
      {file && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["top", "bottom", "left", "right"] as const).map((k) => (
              <div key={k}>
                <Label>{{ top: "Topo", bottom: "Base", left: "Esquerda", right: "Direita" }[k]} (%)</Label>
                <Input inputMode="numeric" value={String(m[k])} onChange={setSide(k)} />
                <input type="range" min={0} max={45} value={m[k]} onChange={setSide(k)} className="w-full accent-brand mt-1" />
              </div>
            ))}
          </div>

          {(thumbs.length > 0 || loading) && (
            <div>
              <Label>Pré-visualização — a área dentro do tracejado é mantida (vale para TODAS as páginas) · mantém ~{keptPct}%</Label>
              {loading && <div className="text-xs text-muted mb-1">Renderizando… {progress}/{total}</div>}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[420px] overflow-auto p-1.5 rounded-lg border border-line bg-surface2/30">
                {thumbs.map((t) => (
                  <div key={t.page} className="relative rounded-md border border-line overflow-hidden">
                    <div className="aspect-[3/4] bg-white"><img src={t.url} alt={`página ${t.page}`} className="w-full h-full object-contain" /></div>
                    <div className="absolute border-2 border-dashed border-brand pointer-events-none" style={inset} />
                    <div className="absolute top-1 left-1 text-xs font-bold bg-black/65 text-white rounded px-1">{t.page}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cortaMuito && <div className="text-sm rounded-lg px-3 py-2 bg-amber-500/15 text-amber-700 dark:text-amber-400">⚠️ Você vai manter só <b>~{keptPct}%</b> da página — isso corta a maior parte do conteúdo. Confira a prévia antes de baixar.</div>}
          {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}
          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={busy || (m.top + m.bottom + m.left + m.right === 0)}><Sparkles size={16} /> {busy ? "Recortando…" : "Recortar e baixar"}</Button>
            <Button variant="ghost" onClick={() => { setFiles([]); setStatus(null); setM({ top: 0, bottom: 0, left: 0, right: 0 }); }}>Limpar</Button>
          </div>
          <div className="text-xs text-muted">🔒 Tudo acontece no seu navegador — o arquivo não é enviado a nenhum servidor.</div>
        </>
      )}
    </div>
  );
}
