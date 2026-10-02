"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { UploadCloud, FileSpreadsheet, X, Sparkles } from "lucide-react";

/* ───────────────── Parsing helpers (portados + melhorados) ───────────────── */
type Src = { name: string; text: string; size: number; enc: string };

function countDelimiter(line: string, d: string) {
  let count = 0, inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], next = line[i + 1];
    if (ch === '"') { if (inQ && next === '"') i++; else inQ = !inQ; }
    else if (!inQ && ch === d) count++;
  }
  return count;
}
function detectDelimiter(text: string): string {
  const cands = [";", ",", "\t", "|"];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 30);
  let best = ";", bestScore = -Infinity;
  for (const d of cands) {
    const counts = lines.map((l) => countDelimiter(l, d));
    const avg = counts.reduce((a, b) => a + b, 0) / Math.max(counts.length, 1);
    const varc = counts.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(counts.length, 1);
    const score = avg * 10 - varc;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}
function parseCsv(text: string, d: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"') { if (inQ && next === '"') { cell += '"'; i++; } else inQ = !inQ; }
    else if (!inQ && ch === d) { row.push(cell); cell = ""; }
    else if (!inQ && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((v) => String(v).trim() !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((v) => String(v).trim() !== "")) rows.push(row);
  return rows;
}
function makeUniqueHeaders(raw: any[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = String(h || `Coluna ${i + 1}`).trim() || `Coluna ${i + 1}`;
    const key = base.toLowerCase(); const c = seen.get(key) || 0; seen.set(key, c + 1);
    return c === 0 ? base : `${base} (${c + 1})`;
  });
}
function shouldKeepAsText(h: string) {
  return /(^|\b)(id|cpf|cnpj|cep|telefone|fone|celular|whatsapp|codigo|código|cod|sku|pedido|documento|matricula|matrícula|processo|nº|numero|número|conta|agencia|agência)(\b|$)/i.test(String(h || ""));
}
function parseBrazilianNumber(value: string): number | null {
  const v = String(value).trim().replace(/\s/g, "");
  if (!v) return null;
  if (/^0\d+$/.test(v)) return null;                                   // 0123 = texto (não número)
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) return Number(v.replace(/\./g, "").replace(",", "."));
  if (/^-?\d+,\d+$/.test(v)) return Number(v.replace(",", "."));
  if (/^-?\d+(\.\d+)?$/.test(v) && v.length <= 15) return Number(v);
  return null;
}
function parseBrazilianDate(value: string): Date | null {
  const v = String(value).trim();
  let m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) { let [, d, mo, y] = m; if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    const dt = new Date(+y, +mo - 1, +d); if (dt.getFullYear() === +y && dt.getMonth() === +mo - 1 && dt.getDate() === +d) return dt; }
  m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) { const [, y, mo, d] = m; const dt = new Date(+y, +mo - 1, +d);
    if (dt.getFullYear() === +y && dt.getMonth() === +mo - 1 && dt.getDate() === +d) return dt; }
  return null;
}
function normalizeCell(value: any, header: string, autotype: boolean): any {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Tenta formatar arrays em JSON (ex: campos do Supabase como fases_comissionadas)
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Transforma o array num texto com quebras de linha e bullets
        return parsed.map((item) => `• ${item}`).join("\n");
      }
    } catch (e) {
      // Ignora se não for JSON válido
    }
  }

  if (!autotype || shouldKeepAsText(header)) return raw;
  const date = parseBrazilianDate(raw); if (date) return date;
  const num = parseBrazilianNumber(raw); if (num !== null && !Number.isNaN(num)) return num;
  return raw;
}
function asExcelSafeText(value: any): string {
  const raw = String(value ?? "").trim(); if (!raw) return "";
  if (/^[=+@]/.test(raw) || /^-[^0-9]/.test(raw)) return `'${raw}`;   // anti CSV/Excel injection
  return raw;
}
function calcWidth(rows: any[][], col: number) {
  const max = rows.reduce((a, r) => Math.max(a, String(r[col] ?? "").length), 10);
  return Math.min(Math.max(max + 3, 12), 48);
}
function safeSheetName(name: string, used: Set<string>) {
  let base = String(name || "Dados").replace(/[\\/?*\[\]:]/g, "").slice(0, 28).trim() || "Dados";
  let n = base, i = 2; while (used.has(n.toLowerCase())) { n = `${base} ${i++}`.slice(0, 31); }
  used.add(n.toLowerCase()); return n;
}
function colName(n: number) { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }
async function readSmart(file: File): Promise<{ text: string; enc: string }> {
  const buf = await file.arrayBuffer();
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, ""), enc: "UTF-8" }; }
  catch { return { text: new TextDecoder("windows-1252").decode(buf).replace(/^﻿/, ""), enc: "Windows-1252" }; }
}
function loadExcelJs(): Promise<void> {
  if ((window as any).ExcelJS) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const ex = document.querySelector('script[data-exceljs-loader="true"]') as HTMLScriptElement | null;
    if (ex) { ex.addEventListener("load", () => resolve(), { once: true }); ex.addEventListener("error", () => reject(new Error("Falha ao carregar ExcelJS.")), { once: true }); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    s.async = true; s.dataset.exceljsLoader = "true";
    s.onload = () => resolve(); s.onerror = () => reject(new Error("Não foi possível carregar a biblioteca ExcelJS."));
    document.head.appendChild(s);
  });
}
const DELIMS: { v: string; label: string }[] = [
  { v: "auto", label: "Detectar automaticamente" }, { v: ";", label: "Ponto e vírgula ( ; )" },
  { v: ",", label: "Vírgula ( , )" }, { v: "\t", label: "Tabulação (TAB)" }, { v: "|", label: "Barra vertical ( | )" },
];

/* ───────────────────────────── Componente ───────────────────────────── */
export function CsvParaExcel() {
  const [srcs, setSrcs] = useState<Src[]>([]);
  const [pasted, setPasted] = useState("");
  const [delim, setDelim] = useState("auto");
  const [hasHeader, setHasHeader] = useState(true);
  const [autotype, setAutotype] = useState(true);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ t: string; ok: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => /\.(csv|txt|tsv)$/i.test(f.name) || f.type.includes("csv") || f.type.includes("text"));
    const read = await Promise.all(arr.map(async (f) => { const { text, enc } = await readSmart(f); return { name: f.name, text, size: f.size, enc }; }));
    setSrcs((s) => [...s, ...read]); setStatus(null);
  }, []);

  const effectiveSrcs: Src[] = useMemo(() => {
    if (srcs.length) return srcs;
    if (pasted.trim()) return [{ name: "Colado", text: pasted, size: pasted.length, enc: "UTF-8" }];
    return [];
  }, [srcs, pasted]);

  // preview da primeira fonte
  const preview = useMemo(() => {
    const src = effectiveSrcs[0]; if (!src) return null;
    const d = delim === "auto" ? detectDelimiter(src.text) : delim;
    const rows = parseCsv(src.text.replace(/^﻿/, "").replace(/\0/g, ""), d);
    if (!rows.length) return { d, cols: 0, dataRows: 0, header: [], body: [] as string[][] };
    const maxCols = Math.max(...rows.map((r) => r.length));
    const padded = rows.map((r) => Array.from({ length: maxCols }, (_, i) => r[i] ?? ""));
    const header = hasHeader ? makeUniqueHeaders(padded[0]) : Array.from({ length: maxCols }, (_, i) => `Coluna ${i + 1}`);
    const body = hasHeader ? padded.slice(1) : padded;
    return { d, cols: maxCols, dataRows: body.length, header, body: body.slice(0, 20) };
  }, [effectiveSrcs, delim, hasHeader]);

  function removeSrc(i: number) { setSrcs((s) => s.filter((_, j) => j !== i)); }

  async function gerar() {
    if (!effectiveSrcs.length) { setStatus({ t: "Selecione um arquivo CSV ou cole o conteúdo.", ok: false }); return; }
    setBusy(true); setStatus({ t: "Carregando motor do Excel e montando a planilha...", ok: true });
    try {
      await loadExcelJs();
      const ExcelJS = (window as any).ExcelJS;
      const wb = new ExcelJS.Workbook();
      wb.creator = "MAPPER · Conversor CSV→Excel"; wb.created = new Date(); wb.modified = new Date();
      const used = new Set<string>(); const resumo: any[][] = [];
      let totalLinhas = 0;

      for (const src of effectiveSrcs) {
        const d = delim === "auto" ? detectDelimiter(src.text) : delim;
        const rows = parseCsv(src.text.replace(/^﻿/, "").replace(/\0/g, ""), d);
        if (!rows.length) continue;
        const maxCols = Math.max(...rows.map((r) => r.length));
        const padded = rows.map((r) => Array.from({ length: maxCols }, (_, i) => r[i] ?? ""));
        const header = hasHeader ? makeUniqueHeaders(padded[0]) : Array.from({ length: maxCols }, (_, i) => `Coluna ${i + 1}`);
        const rawData = hasHeader ? padded.slice(1) : padded;
        const data = rawData.map((r) => r.map((c, i) => { const n = normalizeCell(c, header[i], autotype); return typeof n === "string" ? asExcelSafeText(n) : n; }));

        const sheetName = safeSheetName(src.name.replace(/\.(csv|txt|tsv)$/i, ""), used);
        const ws = wb.addWorksheet(sheetName, { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape" }, properties: { tabColor: { argb: "FF1B75BB" } } });
        ws.addRow(header); data.forEach((r: any) => ws.addRow(r));
        ws.views = [{ state: "frozen", ySplit: 1, zoomScale: 100 }];
        ws.autoFilter = `A1:${colName(maxCols)}1`;
        ws.columns.forEach((col: any, i: number) => { col.width = calcWidth([header, ...rawData], i); });
        ws.getRow(1).height = 30;
        ws.getRow(1).eachCell({ includeEmpty: true }, (cell: any) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B75BB" } };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = { top: { style: "thin", color: { argb: "FF14598F" } }, left: { style: "thin", color: { argb: "FF14598F" } }, bottom: { style: "thin", color: { argb: "FF14598F" } }, right: { style: "thin", color: { argb: "FF14598F" } } };
        });
        ws.eachRow({ includeEmpty: true }, (row: any, n: number) => {
          if (n === 1) return; row.height = 20;
          row.eachCell({ includeEmpty: true }, (cell: any) => {
            const isDate = cell.value instanceof Date, isNum = typeof cell.value === "number";
            const isMultilineText = typeof cell.value === "string" && cell.value.includes("\n");
            cell.font = { color: { argb: "FF111827" }, size: 10 };
            cell.alignment = { vertical: "middle", horizontal: isNum || isDate ? "right" : "left", wrapText: isMultilineText };
            cell.border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: n % 2 === 0 ? "FFF4F8FC" : "FFFFFFFF" } };
            if (isDate) cell.numFmt = "dd/mm/yyyy";
            if (isNum) cell.numFmt = "#,##0.00;[Red]-#,##0.00;0";
          });
        });
        totalLinhas += data.length;
        resumo.push([src.name, d === "\t" ? "TAB" : d, src.enc, maxCols, data.length]);
      }

      if (!wb.worksheets.length) throw new Error("Nenhum dado válido encontrado nos arquivos.");

      // aba de Resumo
      const info = wb.addWorksheet("Resumo");
      info.addRow(["Arquivo", "Delimitador", "Codificação", "Colunas", "Linhas de dados"]);
      resumo.forEach((r) => info.addRow(r));
      info.addRow([]); info.addRow(["Gerado em", new Date()]); info.addRow(["Fonte", "MAPPER · Conversor CSV→Excel"]);
      info.columns = [{ width: 36 }, { width: 16 }, { width: 16 }, { width: 12 }, { width: 16 }];
      info.getRow(1).font = { bold: true };

      const buffer = await wb.xlsx.writeBuffer();
      if (!buffer || buffer.byteLength < 1000) throw new Error("O XLSX gerado ficou pequeno demais.");
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const base = (fileName.trim() || (srcs.length === 1 ? srcs[0].name.replace(/\.(csv|txt|tsv)$/i, "") + "_formatado" : srcs.length > 1 ? `conversao_${srcs.length}_arquivos` : "dados_formatado")).replace(/\.xlsx$/i, "");
      const dl = `${base}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = dl; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setStatus({ t: `Excel gerado: ${dl} · ${wb.worksheets.length - 1} aba(s) · ${totalLinhas} linha(s).`, ok: true });
    } catch (e: any) {
      setStatus({ t: `Não foi possível gerar o Excel: ${e?.message || "erro desconhecido"}`, ok: false });
    } finally { setBusy(false); }
  }

  const chk = "h-4 w-4 rounded border-line text-brand focus:ring-brand/30";
  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-brand bg-brand/10" : "border-line bg-surface2/40 hover:bg-surface2"}`}
      >
        <UploadCloud size={26} className="mx-auto text-brand mb-2" />
        <div className="text-sm font-semibold text-fg">Arraste arquivos CSV aqui ou clique para selecionar</div>
        <div className="text-xs text-muted mt-1">Aceita vários arquivos (.csv, .tsv, .txt) — cada um vira uma aba no Excel.</div>
        <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,text/csv" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.currentTarget.value = ""; }} />
      </div>

      {/* Lista de arquivos */}
      {srcs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {srcs.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs">
              <FileSpreadsheet size={14} className="text-brand" />
              <span className="font-medium text-fg max-w-[200px] truncate" title={s.name}>{s.name}</span>
              <span className="text-muted">{(s.size / 1024).toFixed(0)} KB · {s.enc}</span>
              <button onClick={(e) => { e.stopPropagation(); removeSrc(i); }} className="text-muted hover:text-red-500"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Ou colar */}
      {srcs.length === 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">Ou cole o CSV aqui</div>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} placeholder="cole o conteúdo CSV..."
            className="w-full rounded-lg border border-line bg-surface text-fg px-3 py-2 text-sm font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30" />
        </div>
      )}

      {/* Controles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">Separador</div>
          <select value={delim} onChange={(e) => setDelim(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface text-fg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
            {DELIMS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted font-semibold mb-1">Nome do arquivo de saída (opcional)</div>
          <Input value={fileName} onChange={(e: any) => setFileName(e.target.value)} placeholder="ex: relatorio_formatado" />
        </div>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm text-fg cursor-pointer"><input type="checkbox" className={chk} checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} /> Primeira linha é cabeçalho</label>
        <label className="flex items-center gap-2 text-sm text-fg cursor-pointer"><input type="checkbox" className={chk} checked={autotype} onChange={(e) => setAutotype(e.target.checked)} /> Converter números e datas automaticamente</label>
      </div>

      {/* Preview */}
      {preview && preview.cols > 0 && (
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted mb-1">
            <span><b className="text-fg">{preview.dataRows}</b> linhas</span>
            <span><b className="text-fg">{preview.cols}</b> colunas</span>
            <span>separador: <b className="text-fg">{preview.d === "\t" ? "TAB" : preview.d}</b></span>
            {effectiveSrcs[0] && <span>codificação: <b className="text-fg">{effectiveSrcs[0].enc}</b></span>}
            <span className="text-muted">(prévia de até 20 linhas)</span>
          </div>
          <div className="overflow-auto max-h-[40vh] rounded-lg border border-line">
            <table className="text-xs">
              <thead className="sticky top-0 z-10">
                <tr>{preview.header.map((h, i) => <th key={i} className="text-left px-2.5 py-1.5 bg-surface2 border-b border-line font-semibold text-fg whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.body.map((r, ri) => (
                  <tr key={ri} className="border-b border-line">
                    {r.map((c, ci) => <td key={ci} className="px-2.5 py-1 whitespace-nowrap text-fg">{String(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {status && <div className={`text-sm rounded-lg px-3 py-2 ${status.ok ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>{status.t}</div>}

      <div className="flex items-center gap-3">
        <Button onClick={gerar} disabled={busy || !effectiveSrcs.length}><Sparkles size={16} /> {busy ? "Gerando..." : "Gerar Excel formatado"}</Button>
        {(srcs.length > 0 || pasted) && <Button variant="ghost" onClick={() => { setSrcs([]); setPasted(""); setStatus(null); }}>Limpar</Button>}
      </div>
    </div>
  );
}
