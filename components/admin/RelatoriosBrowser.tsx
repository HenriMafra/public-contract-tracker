"use client";
import { useEffect, useState } from "react";
import { Card, CardPad } from "@/components/ui/primitives";
import { FileText, Download, RefreshCw, FileSpreadsheet, MonitorPlay, Archive, ScrollText, Calendar } from "lucide-react";

type Bucket = { nome: string; label: string; desc: string; icon: string };
type Item = { name: string; folder: boolean; size: number | null; path: string };

const ICONS: Record<string, any> = { FileText, FileSpreadsheet, MonitorPlay, Archive, ScrollText };

function fmtSize(n: number | null) {
  if (!n) return "";
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(0) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}
function dataPasta(name: string) { const m = String(name).match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : name; }
// Nome técnico do arquivo → "o que é" claro.
function explicaArquivo(raw: string) {
  const name = String(raw || ""); const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const low = name.toLowerCase();
  let tipo = "Arquivo", oque = "";
  if (low.includes("ataque")) { tipo = "Lista de ataque"; oque = "todas as oportunidades em planilha"; }
  else if (low.includes("relator")) { tipo = "Relatório"; oque = "resumo da rodada para ler/imprimir"; }
  else if (low.includes("dashboard") || low.includes("painel") || ext === "html") { tipo = "Painel offline"; oque = "abre no navegador sem internet"; }
  else if (low.includes("forneced")) { tipo = "Fornecedores"; oque = "concorrentes/fornecedores mapeados"; }
  else if (ext === "xlsx" || ext === "csv" || low.includes("export")) { tipo = "Planilha"; oque = "dados em tabela (Excel)"; }
  else if (ext === "zip") { tipo = "Pacote (.zip)"; oque = "tudo da rodada junto"; }
  else if (low.includes("log")) { tipo = "Log técnico"; oque = "registro da execução"; }
  return { tipo: `${tipo}${ext ? ` (.${ext})` : ""}`, oque };
}

export function RelatoriosBrowser({ buckets }: { buckets: Bucket[] }) {
  const [bucket, setBucket] = useState(buckets[0]?.nome || "");
  const [datas, setDatas] = useState<Item[]>([]);     // pastas de data (no topo)
  const [dataSel, setDataSel] = useState("");          // path da pasta atual
  const [arquivos, setArquivos] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function listar(b: string, p: string): Promise<Item[]> {
    const r = await fetch(`/api/download-artifact?bucket=${encodeURIComponent(b)}&prefix=${encodeURIComponent(p)}`);
    const j = await r.json(); if (!r.ok) throw new Error(j.error || "Falha ao listar.");
    return j.itens || [];
  }

  // ao trocar de tipo: cai direto nos ARQUIVOS da coleta mais recente (auto-navega as pastas)
  useEffect(() => {
    if (!bucket) return; let alive = true;
    (async () => {
      setLoading(true); setErr(""); setArquivos([]); setDatas([]); setDataSel("");
      try {
        let items = await listar(bucket, ""); let p = ""; let topo: Item[] = [];
        for (let depth = 0; depth < 5; depth++) {
          const folders = items.filter((i) => i.folder).sort((a, b) => String(b.name).localeCompare(String(a.name)));
          const files = items.filter((i) => !i.folder);
          if (depth === 0) topo = folders;
          if (files.length || !folders.length) { if (alive) { setArquivos(files); setDataSel(p); setDatas(topo); } break; }
          p = folders[0].path; items = await listar(bucket, p);
        }
      } catch (e: any) { if (alive) setErr(e?.message || "Erro."); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  async function trocarData(path: string) {
    setLoading(true); setErr(""); setDataSel(path);
    try { let items = await listar(bucket, path); let p = path;
      for (let d = 0; d < 4; d++) { const fo = items.filter((i) => i.folder).sort((a, b) => String(b.name).localeCompare(String(a.name))); const fi = items.filter((i) => !i.folder); if (fi.length || !fo.length) { setArquivos(fi); break; } p = fo[0].path; items = await listar(bucket, p); }
    } catch (e: any) { setErr(e?.message || "Erro."); } finally { setLoading(false); }
  }

  const ativo = buckets.find((b) => b.nome === bucket);
  if (!buckets.length) return <Card><CardPad><div className="text-sm text-muted">Seu perfil não tem acesso a arquivos.</div></CardPad></Card>;

  return (
    <div className="space-y-4">
      {/* 1) Escolha o TIPO (botões explicados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {buckets.map((b) => {
          const Icon = ICONS[b.icon] || FileText; const on = bucket === b.nome;
          return (
            <button key={b.nome} onClick={() => setBucket(b.nome)}
              className={"text-left rounded-xl border p-3.5 transition " + (on ? "border-brand bg-brand/5 shadow-soft" : "border-line bg-surface hover:border-brand/60 hover:bg-surface2")}>
              <div className="flex items-center gap-2 mb-1">
                <span className={"inline-grid place-items-center w-9 h-9 rounded-lg shrink-0 " + (on ? "bg-brand text-white" : "bg-brand/15 text-brand")}><Icon size={18} /></span>
                <span className="font-bold text-fg text-sm">{b.label}</span>
              </div>
              <div className="text-xs text-muted leading-relaxed">{b.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 2) Arquivos da coleta mais recente, como botões de download explicados */}
      <Card><CardPad>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="text-sm font-semibold text-fg">{ativo?.label || "Arquivos"}</div>
          {datas.length > 0 && (
            <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
              <Calendar size={13} /> coleta:
              <select value={dataSel} onChange={(e) => trocarData(e.target.value)} className="h-8 rounded-lg border border-line bg-surface text-fg px-2 text-sm">
                {datas.map((d) => <option key={d.path} value={d.path}>{dataPasta(d.name)}</option>)}
              </select>
            </label>
          )}
          <button onClick={() => setBucket((b) => b)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"><RefreshCw size={12} /> atualizar</button>
        </div>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        {loading ? <div className="text-sm text-muted py-8 text-center">Carregando arquivos…</div> :
          arquivos.length === 0 ? <div className="text-sm text-muted py-8 text-center">Nenhum arquivo deste tipo ainda — será gerado na próxima coleta.</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {arquivos.map((it) => {
                const a = explicaArquivo(it.name);
                return (
                  <a key={it.path} href={`/api/download-artifact?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(it.path)}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-brand hover:shadow-soft transition group">
                    <span className="inline-grid place-items-center w-9 h-9 rounded-lg bg-brand/15 text-brand shrink-0"><Download size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-fg text-sm truncate" title={it.name}>{a.tipo}</div>
                      <div className="text-xs text-muted truncate">{a.oque}{it.size ? ` · ${fmtSize(it.size)}` : ""}</div>
                    </div>
                    <span className="text-xs font-semibold text-brand opacity-0 group-hover:opacity-100 transition shrink-0">baixar</span>
                  </a>
                );
              })}
            </div>
          )}
        <p className="text-xs text-muted mt-3">Clique num arquivo para baixar (link seguro, expira em 60s). Troque a <b>coleta</b> (data) no seletor acima para ver versões anteriores.</p>
      </CardPad></Card>
    </div>
  );
}
