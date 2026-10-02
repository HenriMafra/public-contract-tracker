"use client";
import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, FileText } from "lucide-react";
import { exportJSON, exportCSV, exportXLSX, type Col } from "@/lib/utils/export";

export function ExportButtons({ rows, columns, filename, label = "Exportar" }:
  { rows: any[]; columns?: Col[]; filename: string; label?: string }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const n = rows?.length || 0;
  const disabled = !!busy || n === 0;
  const btn = "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface text-fg text-xs font-semibold hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed transition";

  async function run(kind: "csv" | "json" | "xlsx") {
    setBusy(kind); setMsg("");
    try {
      if (kind === "csv") exportCSV(rows, filename, columns);
      else if (kind === "json") exportJSON(rows, filename, columns);
      else await exportXLSX(rows, filename, columns);
      setMsg(`✓ ${kind.toUpperCase()} (${n})`);
    } catch (e: any) {
      setMsg(kind === "xlsx" ? "XLSX indisponível — tente CSV." : `Falha no ${kind.toUpperCase()}.`);
    } finally { setBusy(""); }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted hidden sm:inline-flex items-center gap-1"><Download size={13} /> {msg || `${label} (${n})`}:</span>
      <button className={btn} disabled={disabled} onClick={() => run("csv")} title="Exportar CSV (Excel pt-BR)"><FileText size={13} /> {busy === "csv" ? "…" : "CSV"}</button>
      <button className={btn} disabled={disabled} onClick={() => run("json")} title="Exportar JSON"><FileJson size={13} /> {busy === "json" ? "…" : "JSON"}</button>
      <button className={btn} disabled={disabled} onClick={() => run("xlsx")} title="Exportar para Excel (.xlsx)"><FileSpreadsheet size={13} /> {busy === "xlsx" ? "…" : "Excel"}</button>
    </div>
  );
}
