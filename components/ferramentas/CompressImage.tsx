"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import { baseName, download } from "@/lib/tools/pdfutils";
import { Sparkles, Lightbulb, AlertTriangle, Image as ImageIcon } from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">{children}</div>;
}
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

type Info = { name: string; w: number; h: number; size: number };

async function compressOne(file: File, maxW: number, quality: number): Promise<Blob> {
  const img = await createImageBitmap(file);
  let w = img.width, h = img.height;
  if (maxW && w > maxW) { h = Math.round((h * maxW) / w); w = maxW; } // só REDUZ — nunca amplia
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); // JPEG não tem transparência
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b as Blob), "image/jpeg", quality / 100));
}

export function CompressImage() {
  const [files, setFiles] = useState<File[]>([]);
  const [infos, setInfos] = useState<Info[]>([]);
  const [quality, setQuality] = useState(75);
  const [maxW, setMaxW] = useState(0); // 0 = mantém o tamanho
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);
  const [stats, setStats] = useState<{ name: string; orig: number; novo: number }[]>([]);

  // Ao soltar/trocar imagens: lê dimensões reais de cada uma (para informar e sugerir).
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!files.length) { setInfos([]); return; }
      const out: Info[] = [];
      for (const f of files) {
        try { const b = await createImageBitmap(f); out.push({ name: f.name, w: b.width, h: b.height, size: f.size }); b.close?.(); }
        catch { out.push({ name: f.name, w: 0, h: 0, size: f.size }); }
      }
      if (!cancel) setInfos(out);
    })();
    return () => { cancel = true; };
  }, [files]);

  const maxDim = infos.reduce((m, i) => Math.max(m, i.w, i.h), 0);
  const maxSize = infos.reduce((m, i) => Math.max(m, i.size), 0);
  const grande = maxDim > 2200 || maxSize > 800 * 1024;        // vale reduzir
  const sugMaxW = maxDim > 2200 ? 1920 : 0;
  const sugQ = 75;
  const sugAplicada = maxW === sugMaxW && quality === sugQ;

  async function run() {
    setStatus(null); setStats([]);
    if (!files.length) { setStatus({ t: "Selecione ao menos uma imagem.", ok: false }); return; }
    setBusy(true);
    try {
      const outs: { name: string; arr: Uint8Array }[] = [];
      const st: { name: string; orig: number; novo: number }[] = [];
      for (const f of files) {
        const blob = await compressOne(f, maxW || 0, quality);
        outs.push({ name: `${baseName(f.name)}.jpg`, arr: new Uint8Array(await blob.arrayBuffer()) });
        st.push({ name: f.name, orig: f.size, novo: blob.size });
      }
      setStats(st);
      const totOrig = st.reduce((s, x) => s + x.orig, 0), totNovo = st.reduce((s, x) => s + x.novo, 0);
      const cresceu = st.filter((x) => x.novo > x.orig).length;
      if (cresceu === st.length) {
        // todas ficaram MAIORES → não baixa; orienta. (típico de PNG pequeno já otimizado virando JPEG)
        setStatus({ t: `Atenção: o resultado ficou MAIOR que o original — suas imagens já estão bem leves. Comprimir não vai ajudar aqui. (Tente uma qualidade menor, ex.: 60%, ou mantenha o arquivo atual.)`, ok: false });
        setBusy(false); return;
      }
      if (outs.length === 1) {
        await download(new Blob([outs[0].arr as any], { type: "image/jpeg" }), outs[0].name, "image/jpeg");
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        outs.forEach((o) => zip.file(o.name, o.arr));
        await download(await zip.generateAsync({ type: "blob" }), "imagens_comprimidas.zip", "application/zip");
      }
      const pct = totOrig ? Math.round((1 - totNovo / totOrig) * 100) : 0;
      const aviso = cresceu > 0 ? ` (atenção: ${cresceu} ficou(ram) maior(es) — já estavam leves)` : "";
      setStatus({ t: `Pronto! ${outs.length} imagem(ns) · ${fmtBytes(totOrig)} → ${fmtBytes(totNovo)} (${pct >= 0 ? pct : 0}% menor)${outs.length > 1 ? " (.zip)" : ""}${aviso}.`, ok: true });
    } catch (e: any) { setStatus({ t: e?.message || "Erro ao comprimir.", ok: false }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted bg-surface2/40 border border-line rounded-lg px-3 py-2">
        <b className="text-fg">O que esta ferramenta faz:</b> deixa fotos JPG/PNG/WebP <b>mais leves</b> (menos MB) para enviar por e-mail/WhatsApp ou subir mais rápido. Ela só <b>reduz</b> — nunca aumenta/estica a imagem.
      </div>

      <FileDrop accept=".jpg,.jpeg,.png,.webp,image/*" multiple files={files} setFiles={setFiles} hint="JPG, PNG ou WebP · uma ou várias (saem em .zip)" />

      {/* Info das imagens + sugestão */}
      {infos.length > 0 && (
        <div className="rounded-lg border border-line bg-surface2/30 p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-fg font-semibold"><ImageIcon size={15} className="text-brand" /> Suas imagens</div>
          <div className="divide-y divide-line">
            {infos.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1 text-xs">
                <span className="truncate text-fg">{it.name}</span>
                <span className="text-muted whitespace-nowrap">{it.w ? `${it.w}×${it.h} px · ` : ""}{fmtBytes(it.size)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 text-xs rounded-md bg-brand/10 text-brand px-2.5 py-2">
            <Lightbulb size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              {grande
                ? <>Dá pra reduzir bastante. <b>Sugestão:</b> largura até <b>{sugMaxW ? `${sugMaxW}px` : "manter"}</b> e qualidade <b>{sugQ}%</b>.</>
                : <>Suas imagens já são pequenas ({maxDim ? `${maxDim}px` : "—"}) — comprimir vai ajudar pouco. Se precisar, use qualidade ~60%.</>}
              {!sugAplicada && grande && <button onClick={() => { setMaxW(sugMaxW); setQuality(sugQ); }} className="ml-2 underline font-semibold hover:opacity-80">aplicar sugestão</button>}
              {sugAplicada && <span className="ml-2 font-semibold">✓ sugestão aplicada</span>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Qualidade: {quality}% <span className="font-normal text-brand/70">(menor = arquivo menor; 70–80% é o ponto ideal)</span></Label>
          <input type="range" min={30} max={95} value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full accent-brand" />
        </div>
        <div>
          <Label>Largura máxima (px) <span className="font-normal text-brand/70">(reduz só se for maior; nunca amplia → bem mais leve)</span></Label>
          <select value={maxW} onChange={(e) => setMaxW(+e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
            <option value={0}>Manter tamanho original</option>
            <option value={3840}>Até 3840 px (4K)</option><option value={1920}>Até 1920 px (Full HD)</option>
            <option value={1280}>Até 1280 px</option><option value={1024}>Até 1024 px</option><option value={800}>Até 800 px</option>
          </select>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="rounded-lg border border-line bg-surface2/30 divide-y divide-line text-sm max-h-56 overflow-auto">
          {stats.map((s, i) => {
            const pct = s.orig ? Math.round((1 - s.novo / s.orig) * 100) : 0;
            const cresceu = s.novo > s.orig;
            return (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="truncate text-fg">{s.name}</span>
                <span className="text-muted whitespace-nowrap">{fmtBytes(s.orig)} → <b className="text-fg">{fmtBytes(s.novo)}</b> {cresceu ? <span className="text-amber-600 dark:text-amber-400">(+{Math.abs(pct)}% — já era leve)</span> : <span className="text-emerald-600 dark:text-emerald-400">(-{pct}%)</span>}</span>
              </div>
            );
          })}
        </div>
      )}

      {status && (
        <div className={`text-sm rounded-lg px-3 py-2 flex items-start gap-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
          {!status.ok && <AlertTriangle size={15} className="shrink-0 mt-0.5" />} <span>{status.t}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy || !files.length}><Sparkles size={16} /> {busy ? "Comprimindo…" : "Comprimir e baixar"}</Button>
        {files.length > 0 && <Button variant="ghost" onClick={() => { setFiles([]); setStatus(null); setStats([]); }}>Limpar</Button>}
      </div>
      <div className="text-xs text-muted">🔒 Tudo acontece no seu navegador — as imagens não são enviadas a nenhum servidor.</div>
    </div>
  );
}
