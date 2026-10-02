// Registro central das Ferramentas (hub tipo iLovePDF, porém PRIVADO e 100% GRÁTIS).
// Regra: só entram ferramentas que rodam client-side com libs grátis/open-source —
// nada de API paga / IA paga. (Por isso "Resumir com IA" e "Traduzir PDF" ficam de fora.)
// `ready: true` => já funciona e validado; `false` => aparece como "em breve".
export type Tool = {
  slug: string; title: string; desc: string; group: string;
  ready: boolean; icon: string; href?: string;
};

export const TOOLS: Tool[] = [
  // ───────────────── PDF ─────────────────
  { slug: "juntar-pdf", title: "Juntar PDF", desc: "Combine vários PDFs em um só, na ordem que quiser.", group: "PDF", ready: true, icon: "Layers" },
  { slug: "dividir-pdf", title: "Dividir PDF", desc: "Extraia páginas ou intervalos (clicando nas miniaturas).", group: "PDF", ready: true, icon: "Scissors" },
  { slug: "organizar-pdf", title: "Organizar PDF", desc: "Reordene (arrastando) e exclua páginas.", group: "PDF", ready: true, icon: "LayoutGrid" },
  { slug: "recortar-pdf", title: "Recortar PDF", desc: "Apare as margens das páginas (com pré-visualização).", group: "PDF", ready: true, icon: "Crop" },
  { slug: "girar-pdf", title: "Girar PDF", desc: "Gire as páginas 90°, 180° ou 270°.", group: "PDF", ready: true, icon: "RotateCw" },
  { slug: "numerar-pdf", title: "Números de página", desc: "Adicione numeração (posição, início e formato).", group: "PDF", ready: true, icon: "Hash" },
  { slug: "marca-dagua", title: "Marca d'água", desc: "Texto em diagonal em todas as páginas.", group: "PDF", ready: true, icon: "Stamp" },
  { slug: "assinar-pdf", title: "Assinar PDF", desc: "Desenhe sua assinatura e aplique na página que quiser.", group: "PDF", ready: true, icon: "Signature" },
  { slug: "comparar-pdf", title: "Comparar PDF", desc: "Veja o que mudou entre duas versões (por texto).", group: "PDF", ready: true, icon: "GitCompare" },

  // ───────────────── Converter ─────────────────
  { slug: "imagem-para-pdf", title: "Imagem → PDF", desc: "JPG/PNG viram um PDF (uma imagem por página).", group: "Converter", ready: true, icon: "Image" },
  { slug: "pdf-jpg", title: "PDF → JPG", desc: "Exporte cada página como imagem (várias páginas saem em .zip).", group: "Converter", ready: true, icon: "Images" },
  { slug: "csv-excel", title: "CSV → Excel", desc: "Converta CSV em planilha Excel formatada.", group: "Converter", ready: true, icon: "FileSpreadsheet", href: "/ferramentas/csv-excel" },

  // ───────────────── Imagem ─────────────────
  { slug: "comprimir-imagem", title: "Comprimir imagem", desc: "Reduza o peso de JPG/PNG/WebP (qualidade + tamanho).", group: "Imagem", ready: true, icon: "ImageMinus" },
];

export const READY_PDF_SLUGS = TOOLS.filter((t) => t.ready && !t.href).map((t) => t.slug);
export function toolBySlug(slug: string) { return TOOLS.find((t) => t.slug === slug); }
export function toolHref(t: Tool) { return t.href || `/ferramentas/${t.slug}`; }
