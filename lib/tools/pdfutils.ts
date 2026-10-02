// Utilitários de PDF — 100% client-side (pdf-lib carregado sob demanda).
// Nada é enviado para servidor: tudo roda no navegador do usuário.

export async function download(bytes: Uint8Array | Blob, name: string, mime = "application/pdf") {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as any], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function parseRanges(spec: string, total: number): number[] {
  const set = new Set<number>();
  spec.split(",").map((s) => s.trim()).filter(Boolean).forEach((part) => {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { let a = +m[1], b = +m[2]; if (a > b) [a, b] = [b, a]; for (let i = a; i <= b; i++) if (i >= 1 && i <= total) set.add(i - 1); }
    else { const n = +part; if (n >= 1 && n <= total) set.add(n - 1); }
  });
  return [...set].sort((a, b) => a - b);
}

/** Inverso de parseRanges: lista de páginas (1-based) → texto compacto "1-3,5,8". */
export function pagesToRanges(pages: number[]): string {
  const xs = Array.from(new Set(pages.filter((n) => n >= 1))).sort((a, b) => a - b);
  if (!xs.length) return "";
  const parts: string[] = [];
  let ini = xs[0], prev = xs[0];
  for (let i = 1; i <= xs.length; i++) {
    const cur = xs[i];
    if (cur === prev + 1) { prev = cur; continue; }
    parts.push(ini === prev ? `${ini}` : `${ini}-${prev}`);
    ini = prev = cur;
  }
  return parts.join(",");
}

export async function pageCount(file: File): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return await out.save();
}

export async function extractPages(file: File, indices: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return await out.save();
}

export async function rotatePdf(file: File, deg: number, indices?: number[]): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  doc.getPages().forEach((p, i) => {
    if (!indices || indices.includes(i)) {
      const cur = p.getRotation().angle;
      p.setRotation(degrees(((cur + deg) % 360 + 360) % 360));
    }
  });
  return await doc.save();
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (const f of files) {
    const ab = await f.arrayBuffer();
    const isPng = /png$/i.test(f.type) || /\.png$/i.test(f.name);
    const img = isPng ? await doc.embedPng(ab) : await doc.embedJpg(ab);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await doc.save();
}

type NumPos = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right";
export async function addPageNumbers(file: File, opts: { pos?: NumPos; start?: number; fmt?: string } = {}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const start = opts.start ?? 1;
  const total = doc.getPageCount();
  const size = 10;
  doc.getPages().forEach((p, i) => {
    const { width, height } = p.getSize();
    const text = (opts.fmt || "{n}").replace("{n}", String(i + start)).replace("{total}", String(total));
    const tw = font.widthOfTextAtSize(text, size);
    const pos = opts.pos || "bottom-center";
    let x = width / 2 - tw / 2, y = 18;
    if (pos.includes("right")) x = width - tw - 28;
    if (pos.includes("left")) x = 28;
    if (pos.startsWith("top")) y = height - 24;
    p.drawText(text, { x, y, size, font, color: rgb(0.25, 0.25, 0.25) });
  });
  return await doc.save();
}

export async function watermarkPdf(file: File, text: string, opts: { opacity?: number } = {}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.getPages().forEach((p) => {
    const { width, height } = p.getSize();
    const size = Math.max(18, Math.min(width, height) / 9);
    const tw = font.widthOfTextAtSize(text, size);
    // origem deslocada para o texto cruzar o centro na diagonal de 45°
    const x = width / 2 - (tw / 2) * Math.cos(Math.PI / 4);
    const y = height / 2 - (tw / 2) * Math.sin(Math.PI / 4);
    p.drawText(text, { x, y, size, font, color: rgb(0.55, 0.55, 0.6), opacity: opts.opacity ?? 0.28, rotate: degrees(45) });
  });
  return await doc.save();
}

/** Recorta (apara) as margens de todas as páginas. Margens em % de cada lado. */
export async function cropPdf(file: File, m: { top: number; bottom: number; left: number; right: number }): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    const l = (width * Math.max(0, m.left)) / 100, r = (width * Math.max(0, m.right)) / 100;
    const t = (height * Math.max(0, m.top)) / 100, b = (height * Math.max(0, m.bottom)) / 100;
    const nw = Math.max(10, width - l - r), nh = Math.max(10, height - t - b);
    p.setCropBox(l, b, nw, nh);
  }
  return await doc.save();
}

export function baseName(name: string) { return name.replace(/\.[^.]+$/, ""); }
