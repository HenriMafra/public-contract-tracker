"use client";
import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import { Sparkles, Plus, Minus, ArrowLeftRight } from "lucide-react";

const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs";
async function loadPdfjs() { const p: any = await import("pdfjs-dist"); p.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return p; }

async function extractText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i); const tc = await pg.getTextContent(); out += tc.items.map((it: any) => it.str).join(" ") + "\n"; }
  return out;
}
function trechos(t: string) { return Array.from(new Set(t.split(/\n|(?<=\.)\s+/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 4))); }

/** Comparar PDF — extrai o texto dos dois e mostra o que mudou (trechos só no 1º / só no 2º). */
export function ComparePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ soA: string[]; soB: string[]; iguais: number } | null>(null);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);

  async function run() {
    if (files.length < 2) { setStatus({ t: "Selecione 2 PDFs para comparar.", ok: false }); return; }
    setBusy(true); setStatus(null); setRes(null);
    try {
      const [tA, tB] = await Promise.all([extractText(files[0]), extractText(files[1])]);
      const A = trechos(tA), B = trechos(tB);
      const setA = new Set(A), setB = new Set(B);
      const soA = A.filter((l) => !setB.has(l));
      const soB = B.filter((l) => !setA.has(l));
      const iguais = A.filter((l) => setB.has(l)).length;
      setRes({ soA, soB, iguais });
      setStatus({ t: `Pronto: ${iguais} trechos iguais · ${soA.length} removido(s) · ${soB.length} adicionado(s).`, ok: true });
    } catch (e: any) { setStatus({ t: e?.message || "Erro ao comparar.", ok: false }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <FileDrop accept=".pdf,application/pdf" multiple files={files} setFiles={setFiles} hint="Selecione 2 PDFs — o 1º é a versão ANTIGA e o 2º a NOVA" />
      {files.length > 0 && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="px-2.5 py-1 rounded-lg border border-line bg-surface2/40"><b className="text-red-600 dark:text-red-400">1º · antigo:</b> {files[0]?.name || "—"}</span>
          <button onClick={() => setFiles((f) => (f.length >= 2 ? [f[1], f[0], ...f.slice(2)] : f))} disabled={files.length < 2}
            className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-line hover:bg-surface2 disabled:opacity-40" title="Trocar a ordem (antigo ⇄ novo)"><ArrowLeftRight size={13} /> inverter</button>
          <span className="px-2.5 py-1 rounded-lg border border-line bg-surface2/40"><b className="text-emerald-600 dark:text-emerald-400">2º · novo:</b> {files[1]?.name || (files.length < 2 ? "falta 1" : "—")}</span>
          {files.length > 2 && <span className="text-xs text-muted">(uso só os 2 primeiros)</span>}
        </div>
      )}
      {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy || files.length < 2}><Sparkles size={16} /> {busy ? "Comparando…" : "Comparar"}</Button>
        {files.length > 0 && <Button variant="ghost" onClick={() => { setFiles([]); setRes(null); setStatus(null); }}>Limpar</Button>}
      </div>

      {res && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-line bg-surface2/30 p-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-red-600 dark:text-red-400 mb-2"><Minus size={15} /> Removido — só no antigo ({res.soA.length})</div>
            {res.soA.length === 0 ? <div className="text-xs text-muted">Nada exclusivo.</div> :
              <ul className="space-y-1 max-h-80 overflow-auto text-sm">{res.soA.slice(0, 300).map((l, i) => <li key={i} className="text-fg border-b border-line/60 pb-1">{l}</li>)}</ul>}
          </div>
          <div className="rounded-lg border border-line bg-surface2/30 p-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2"><Plus size={15} /> Adicionado — só no novo ({res.soB.length})</div>
            {res.soB.length === 0 ? <div className="text-xs text-muted">Nada exclusivo.</div> :
              <ul className="space-y-1 max-h-80 overflow-auto text-sm">{res.soB.slice(0, 300).map((l, i) => <li key={i} className="text-fg border-b border-line/60 pb-1">{l}</li>)}</ul>}
          </div>
        </div>
      )}
      <div className="text-xs text-muted">🔒 Comparação feita no seu navegador (por texto). Bom para ver o que mudou entre duas versões de um edital/contrato.</div>
    </div>
  );
}
