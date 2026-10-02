"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { brl } from "@/lib/utils/format";
import { exportXLSX, type Col } from "@/lib/utils/export";
import { Printer, FileSpreadsheet, Loader2 } from "lucide-react";

type Rel = {
  total: number; valor_total: number; vencidos: number; venc90: number; validadas: number;
  por_uf: { uf: string; n: number; v: number }[];
  por_fab: { fab: string; n: number; v: number }[];
  por_urg: { urg: string; n: number }[];
  urgentes: { orgao: string; uf: string; municipio: string; solucao: string; valor: number; dias: number }[];
  maiores: { orgao: string; uf: string; solucao: string; fabricante: string; valor: number }[];
};

const nf = (n: any) => Number(n || 0).toLocaleString("pt-BR");
const EXPORT_COLS: Col[] = [
  { key: "orgao_padronizado", label: "Órgão" }, { key: "uf", label: "UF" }, { key: "municipio", label: "Município" },
  { key: "categoria_principal", label: "Solução" }, { key: "fabricante", label: "Fabricante" },
  { key: "nome_fornecedor", label: "Fornecedor atual" }, { key: "valor_total", label: "Valor (R$)" },
  { key: "dias_ate_vencimento", label: "Dias p/ vencer" }, { key: "fim_vigencia", label: "Fim vigência" },
  { key: "urgencia_comercial", label: "Urgência" }, { key: "score_comercial", label: "Score" }, { key: "status_validacao", label: "Decisão" },
];

export function RelatorioView({ data, nome, hoje }: { data: Rel | null; nome: string; hoje: string }) {
  const [baixando, setBaixando] = useState(false);
  const [erroXls, setErroXls] = useState("");

  async function baixarExcel() {
    setBaixando(true); setErroXls("");
    try {
      const sb = supabaseBrowser();
      const PAGE = 50000; const acc: any[] = [];
      const COLS = "orgao_padronizado,uf,municipio,categoria_principal,fabricante,nome_fornecedor,valor_total,dias_ate_vencimento,fim_vigencia,urgencia_comercial,score_comercial,status_validacao";
      for (let i = 0; i < 8; i++) {
        const { data: d, error } = await sb.from("vw_lista_ataque_atual").select(COLS).neq("status_validacao", "Descartada").range(i * PAGE, i * PAGE + PAGE - 1);
        if (error || !d || !d.length) break;
        acc.push(...d); if (d.length < PAGE) break;
      }
      if (!acc.length) { setErroXls("Nada para exportar."); return; }
      await exportXLSX(acc, "mapper_relatorio", EXPORT_COLS);
    } catch { setErroXls("Falha ao gerar o Excel — tente novamente."); }
    finally { setBaixando(false); }
  }

  if (!data) return (
    <div className="border border-line rounded-xl bg-surface p-8 text-center text-muted">
      Não foi possível montar o relatório agora. Recarregue a página; se continuar, avise em Sugestões &amp; Bugs.
    </div>
  );

  // ── tabela corporativa reutilizável (sem enfeites) ──
  const Tabela = ({ cols, rows }: { cols: { h: string; right?: boolean }[]; rows: (string | number)[][] }) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b-2 border-fg/80">
          {cols.map((c, i) => <th key={i} className={"py-1.5 px-2 text-[11px] uppercase tracking-wide text-muted font-bold " + (c.right ? "text-right" : "text-left")}>{c.h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-b border-line">
            {r.map((cell, ci) => <td key={ci} className={"py-1.5 px-2 " + (cols[ci]?.right ? "text-right tabular-nums whitespace-nowrap" : "text-fg")}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const Sec = ({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) => (
    <section className="rb-sec">
      <h2 className="text-[13px] font-bold text-fg uppercase tracking-wide border-b border-fg/30 pb-1 mb-2">{n}. {titulo}</h2>
      {children}
    </section>
  );

  return (
    <div className="space-y-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #relatorio, #relatorio * { visibility: visible !important; }
        #relatorio { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .no-print { display: none !important; }
        .rb-sec { break-inside: avoid; }
        @page { margin: 18mm; }
      }`}</style>

      {/* Ações (não imprimem) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-surface border border-line rounded-xl p-3">
        <div className="text-sm text-muted">Documento executivo da sua base. Os números respeitam o seu acesso (você só vê os seus órgãos/região).</div>
        <div className="flex items-center gap-2">
          {erroXls && <span className="text-xs text-red-600">{erroXls}</span>}
          <button onClick={baixarExcel} disabled={baixando} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface text-fg text-xs font-semibold hover:bg-surface2 disabled:opacity-50 transition">
            {baixando ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Baixar Excel
          </button>
          <button onClick={() => window.print()} className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-600 transition"><Printer size={14} /> Salvar / Imprimir PDF</button>
        </div>
      </div>

      {/* DOCUMENTO */}
      <div id="relatorio" className="bg-surface border border-line rounded-xl p-7 sm:p-9 text-fg">
        {/* Cabeçalho corporativo */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-fg/80 pb-3 mb-5">
          <div>
            <div className="text-xl font-extrabold tracking-tight">RELATÓRIO COMERCIAL</div>
            <div className="text-xs text-muted mt-0.5">MAPPER · Inteligência de Contratos Públicos (PNCP)</div>
          </div>
          <div className="text-right text-[11px] text-muted leading-relaxed shrink-0">
            <div>Emitido em <b className="text-fg">{hoje}</b></div>
            {nome && <div>Responsável: <b className="text-fg">{nome}</b></div>}
            <div>Base: oportunidades ativas</div>
          </div>
        </header>

        <div className="space-y-6">
          {/* 1. Resumo executivo */}
          <Sec n={1} titulo="Resumo executivo">
            <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden">
              {[
                { l: "Oportunidades ativas", v: nf(data.total) },
                { l: "Valor total em contratos", v: brl(data.valor_total) },
                { l: "Vencendo em até 90 dias", v: nf(data.venc90) },
                { l: "Já vencidos (atrasados)", v: nf(data.vencidos) },
              ].map((k, i) => (
                <div key={i} className="p-3 border-line [&:not(:last-child)]:border-r border-b lg:border-b-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted font-semibold">{k.l}</div>
                  <div className="text-lg font-extrabold mt-0.5">{k.v}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Fotografia atual da sua base. “Ativas” exclui as oportunidades descartadas. “Valor total” é a soma dos valores de contrato — referência de potencial, não receita garantida. {nf(data.validadas)} já validada(s).</p>
          </Sec>

          {/* 2. Prioritárias */}
          <Sec n={2} titulo="Oportunidades prioritárias — vencimento em até 90 dias">
            {data.urgentes.length === 0
              ? <p className="text-sm text-muted">Nenhuma oportunidade vencendo nos próximos 90 dias.</p>
              : <Tabela cols={[{ h: "Órgão" }, { h: "UF" }, { h: "Solução" }, { h: "Valor (R$)", right: true }, { h: "Vence (dias)", right: true }]}
                  rows={data.urgentes.map((r) => [r.orgao, r.uf || "—", r.solucao || "—", brl(r.valor), `${r.dias}`])} />}
          </Sec>

          {/* 3. Maiores por valor */}
          <Sec n={3} titulo="Maiores oportunidades por valor">
            <Tabela cols={[{ h: "Órgão" }, { h: "UF" }, { h: "Solução / Fabricante" }, { h: "Valor (R$)", right: true }]}
              rows={data.maiores.map((r) => [r.orgao, r.uf || "—", [r.solucao, r.fabricante].filter(Boolean).join(" · ") || "—", brl(r.valor)])} />
          </Sec>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 4. Por UF */}
            <Sec n={4} titulo="Distribuição por estado (UF)">
              <Tabela cols={[{ h: "UF" }, { h: "Qtd", right: true }, { h: "Valor (R$)", right: true }]}
                rows={data.por_uf.map((r) => [r.uf, nf(r.n), brl(r.v)])} />
            </Sec>

            {/* 5. Fabricantes */}
            <Sec n={5} titulo="Principais fabricantes">
              {data.por_fab.length === 0
                ? <p className="text-sm text-muted">Fabricante ainda não identificado nos contratos da base.</p>
                : <Tabela cols={[{ h: "Fabricante" }, { h: "Qtd", right: true }, { h: "Valor (R$)", right: true }]}
                    rows={data.por_fab.map((r) => [r.fab, nf(r.n), brl(r.v)])} />}
            </Sec>
          </div>

          {/* 6. Por urgência */}
          <Sec n={6} titulo="Distribuição por urgência">
            <Tabela cols={[{ h: "Urgência" }, { h: "Qtd", right: true }]} rows={data.por_urg.map((r) => [r.urg, nf(r.n)])} />
          </Sec>
        </div>

        <footer className="border-t border-line mt-7 pt-3 text-[10px] text-muted leading-relaxed">
          Documento gerado automaticamente pelo MAPPER em {hoje}. Fonte: Portal Nacional de Contratações Públicas (PNCP). Os dados respeitam o escopo de acesso do responsável. Este relatório tem finalidade de inteligência comercial e não constitui recomendação formal de investimento ou contratação.
        </footer>
      </div>
    </div>
  );
}
