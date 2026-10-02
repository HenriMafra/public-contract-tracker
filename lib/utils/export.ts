// Exportação client-side: JSON / CSV / XLSX. XLSX é carregado sob demanda (dynamic import).
export type Col = { key: string; label: string };

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

function shape(rows: any[], cols?: Col[]) {
  if (!cols) return rows;
  return rows.map((r) => { const o: Record<string, any> = {}; cols.forEach((c) => { o[c.label] = r[c.key]; }); return o; });
}

export function exportJSON(rows: any[], base: string, cols?: Col[]) {
  downloadBlob(`${base}.json`, new Blob([JSON.stringify(shape(rows, cols), null, 2)], { type: "application/json;charset=utf-8" }));
}

function csvCell(v: any): string {
  if (v == null) return "";
  const s = String(v);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function exportCSV(rows: any[], base: string, cols?: Col[]) {
  const columns: Col[] = cols || Object.keys(rows[0] || {}).map((k) => ({ key: k, label: k }));
  const header = columns.map((c) => csvCell(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(";"));
  // BOM + separador ';' => abre certinho no Excel pt-BR com acentos
  const csv = "﻿" + [header, ...body].join("\r\n");
  downloadBlob(`${base}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export async function exportXLSX(rows: any[], base: string, cols?: Col[]) {
  const XLSX: any = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(shape(rows, cols));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MAPPER");
  // XLSX.write(type:"array") + downloadBlob é mais confiável no bundle (Workers/browser)
  // do que XLSX.writeFile (que faz detecção de ambiente e pode quebrar empacotado).
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(`${base}.xlsx`, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}
