"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { FileDrop } from "./FileDrop";
import * as P from "@/lib/tools/pdfutils";
import { Sparkles, Check } from "lucide-react";
import { PdfToJpg } from "./PdfToJpg";
import { OrganizePdf } from "./OrganizePdf";
import { CompressImage } from "./CompressImage";
import { CropPdf } from "./CropPdf";
import { SignPdf } from "./SignPdf";
import { ComparePdf } from "./ComparePdf";
import { usePdfThumbs } from "./PdfThumbs";
import { cn } from "@/lib/utils/format";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">{children}</div>;
}

export function PdfTool({ slug }: { slug: string }) {
  // ferramentas baseadas em render (pdf.js) têm componente próprio
  if (slug === "pdf-jpg") return <PdfToJpg />;
  if (slug === "organizar-pdf") return <OrganizePdf />;
  if (slug === "comprimir-imagem") return <CompressImage />;
  if (slug === "recortar-pdf") return <CropPdf />;
  if (slug === "assinar-pdf") return <SignPdf />;
  if (slug === "comparar-pdf") return <ComparePdf />;
  return <PdfLibTool slug={slug} />;
}

function PdfLibTool({ slug }: { slug: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  // opções
  const [ranges, setRanges] = useState("");
  const [deg, setDeg] = useState(90);
  const [numPos, setNumPos] = useState("bottom-center");
  const [numStart, setNumStart] = useState("1");
  const [numFmt, setNumFmt] = useState("{n}");
  const [wmText, setWmText] = useState("CONFIDENCIAL");
  const [wmOpacity, setWmOpacity] = useState(28);

  const multiple = slug === "juntar-pdf" || slug === "imagem-para-pdf";
  const isImg = slug === "imagem-para-pdf";
  const single = !multiple && !isImg;
  const accept = isImg ? ".jpg,.jpeg,.png,image/*" : ".pdf,application/pdf";

  useEffect(() => {
    let alive = true; setCount(null); setStatus(null);
    if (single && files[0]) P.pageCount(files[0]).then((c) => alive && setCount(c)).catch(() => {});
    return () => { alive = false; };
  }, [files, single]);

  // pré-visualização das páginas (todos os tools de 1 arquivo) — o documento "aparece"
  const previewFile = single ? (files[0] || null) : null;
  const { thumbs, total: thTotal, loading: thLoading, progress: thProg } = usePdfThumbs(previewFile, 0.5);
  const totalPg = count ?? thTotal ?? 0;
  // Dividir PDF: clicar nas miniaturas seleciona páginas (sincroniza com o campo de texto)
  const selectedPages = useMemo(
    () => slug === "dividir-pdf" ? new Set(P.parseRanges(ranges, totalPg || 99999).map((i) => i + 1)) : new Set<number>(),
    [ranges, slug, totalPg]
  );
  function togglePage(p: number) {
    const cur = new Set(P.parseRanges(ranges, totalPg || 99999).map((i) => i + 1));
    cur.has(p) ? cur.delete(p) : cur.add(p);
    setRanges(P.pagesToRanges([...cur]));
  }

  async function run() {
    setStatus(null);
    if (!files.length) { setStatus({ t: "Selecione ao menos um arquivo.", ok: false }); return; }
    setBusy(true);
    try {
      let bytes: Uint8Array, out: string, mime = "application/pdf";
      const b = files[0] ? P.baseName(files[0].name) : "arquivo";
      switch (slug) {
        case "juntar-pdf":
          if (files.length < 2) throw new Error("Selecione pelo menos 2 PDFs.");
          bytes = await P.mergePdfs(files); out = "juntado.pdf"; break;
        case "dividir-pdf": {
          const total = count ?? (await P.pageCount(files[0]));
          const idx = P.parseRanges(ranges, total);
          if (!idx.length) throw new Error("Informe páginas válidas (ex.: 1-3,5).");
          bytes = await P.extractPages(files[0], idx); out = `${b}_paginas.pdf`; break;
        }
        case "girar-pdf": {
          const total = count ?? (await P.pageCount(files[0]));
          const idx = ranges.trim() ? P.parseRanges(ranges, total) : undefined;
          bytes = await P.rotatePdf(files[0], deg, idx); out = `${b}_girado.pdf`; break;
        }
        case "numerar-pdf":
          bytes = await P.addPageNumbers(files[0], { pos: numPos as any, start: parseInt(numStart) || 1, fmt: numFmt || "{n}" });
          out = `${b}_numerado.pdf`; break;
        case "marca-dagua":
          if (!wmText.trim()) throw new Error("Digite o texto da marca d'água.");
          bytes = await P.watermarkPdf(files[0], wmText.trim(), { opacity: wmOpacity / 100 });
          out = `${b}_marca.pdf`; break;
        case "imagem-para-pdf":
          bytes = await P.imagesToPdf(files); out = "imagens.pdf"; break;
        default: throw new Error("Ferramenta não disponível.");
      }
      await P.download(bytes, out, mime);
      setStatus({ t: `Pronto! Arquivo gerado: ${out}`, ok: true });
    } catch (e: any) { setStatus({ t: e?.message || "Erro ao processar o arquivo.", ok: false }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <FileDrop accept={accept} multiple={multiple} files={files} setFiles={setFiles}
        hint={isImg ? "JPG ou PNG · vários arquivos (1 por página, na ordem enviada)" : multiple ? "Vários PDFs · serão juntados na ordem enviada" : "Um arquivo PDF"} />

      {!multiple && !isImg && count != null && <div className="text-xs text-muted">{count} página(s) detectada(s).</div>}

      {/* Opções por ferramenta */}
      {slug === "dividir-pdf" && (
        <div><Label>Páginas a extrair <span className="font-normal text-brand/70">(intervalos e vírgulas; só as marcadas viram o novo PDF)</span></Label>
          <Input value={ranges} onChange={(e: any) => setRanges(e.target.value)} placeholder="ex.: 1-3,5,8-10" />
        </div>
      )}
      {slug === "girar-pdf" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Ângulo</Label>
            <select value={deg} onChange={(e) => setDeg(+e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value={90}>90° (horário)</option><option value={180}>180°</option><option value={270}>270° (anti-horário)</option>
            </select>
          </div>
          <div><Label>Páginas (vazio = todas)</Label><Input value={ranges} onChange={(e: any) => setRanges(e.target.value)} placeholder="ex.: 1,3-4" /></div>
        </div>
      )}
      {slug === "numerar-pdf" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>Posição</Label>
            <select value={numPos} onChange={(e) => setNumPos(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
              <option value="bottom-center">Rodapé centro</option><option value="bottom-right">Rodapé direita</option><option value="bottom-left">Rodapé esquerda</option><option value="top-center">Topo centro</option><option value="top-right">Topo direita</option>
            </select>
          </div>
          <div><Label>Começar em</Label><Input value={numStart} onChange={(e: any) => setNumStart(e.target.value)} inputMode="numeric" /></div>
          <div><Label>Formato</Label><Input value={numFmt} onChange={(e: any) => setNumFmt(e.target.value)} placeholder="{n} ou {n}/{total}" /></div>
        </div>
      )}
      {slug === "marca-dagua" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div><Label>Texto</Label><Input value={wmText} onChange={(e: any) => setWmText(e.target.value)} placeholder="CONFIDENCIAL" /></div>
          <div><Label>Opacidade: {wmOpacity}%</Label>
            <input type="range" min={5} max={80} value={wmOpacity} onChange={(e) => setWmOpacity(+e.target.value)} className="w-full accent-brand" />
          </div>
        </div>
      )}

      {/* Pré-visualização do documento — as páginas aparecem. No Dividir, clicar seleciona. */}
      {single && previewFile && (thumbs.length > 0 || thLoading) && (
        <div>
          <Label>{slug === "dividir-pdf" ? "Clique nas páginas que quer extrair" : "Pré-visualização do documento"}</Label>
          {thLoading && <div className="text-xs text-muted mb-1">Renderizando páginas… {thProg}/{thTotal}</div>}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[440px] overflow-auto p-1.5 rounded-lg border border-line bg-surface2/30">
            {thumbs.map((t) => {
              const clickable = slug === "dividir-pdf";
              const sel = selectedPages.has(t.page);
              return (
                <div key={t.page} onClick={clickable ? () => togglePage(t.page) : undefined}
                  className={cn("relative rounded-md border overflow-hidden transition", clickable && "cursor-pointer hover:border-brand", sel ? "border-emerald-500 ring-2 ring-emerald-500/40" : clickable ? "border-line opacity-50 hover:opacity-100" : "border-line")}>
                  <div className="aspect-[3/4] bg-white grid place-items-center"><img src={t.url} alt={`página ${t.page}`} className="w-full h-full object-contain" /></div>
                  <div className="absolute top-1 left-1 text-xs font-bold bg-black/65 text-white rounded px-1">{t.page}</div>
                  {clickable && sel && <div className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[10px] font-bold text-center py-0.5">SERÁ EXTRAÍDA</div>}
                </div>
              );
            })}
          </div>
          {slug === "dividir-pdf" && <div className="text-xs text-muted mt-1">O novo PDF terá <b className="text-emerald-600 dark:text-emerald-400">{selectedPages.size}</b> página(s) — as marcadas em verde. Ou digite acima (ex.: 1-3,5).</div>}
        </div>
      )}

      {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}

      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={busy || !files.length}><Sparkles size={16} /> {busy ? "Processando..." : "Processar e baixar"}</Button>
        {files.length > 0 && <Button variant="ghost" onClick={() => { setFiles([]); setStatus(null); }}>Limpar</Button>}
      </div>

      <div className="text-xs text-muted">🔒 Tudo acontece no seu navegador — o arquivo não é enviado para nenhum servidor.</div>
    </div>
  );
}
