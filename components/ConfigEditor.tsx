"use client";
import { useState } from "react";
import { Button, Card, CardPad, Select } from "@/components/ui/primitives";

// Explica, em português claro, o que cada parâmetro faz e QUANDO a mudança vale.
function explicaImpacto(chave: string): string {
  const c = (chave || "").toLowerCase();
  if (c.includes("categor")) return "Palavras/categorias que o sistema usa para reconhecer contratos de TI. Adicionar um termo faz o classificador passar a marcar contratos que o contenham — vale a partir da PRÓXIMA coleta; não reclassifica o que já está no banco.";
  if (c.includes("valid") || (c.includes("status") && !c.includes("comercial"))) return "Os valores possíveis de “Decisão” (Em análise, Validada, Descartada, Monitoramento, Pendente). ⚠️ Não remova os que os botões já usam, senão a decisão para de funcionar. Um valor novo só aparece se a tela também passar a usá-lo.";
  if (c.includes("peso") || c.includes("score") || c.includes("priorid")) return "Pesos do cálculo de score/prioridade. Mudar altera a ordem das oportunidades (Top 10, Lista de Ataque) na PRÓXIMA rodada.";
  if (c.includes("modalidad")) return "Modalidades de licitação coletadas no PNCP. Afeta a PRÓXIMA coleta de editais.";
  if (c.includes("uf") || c.includes("estado")) return "UFs (estados) coletados. Afeta a PRÓXIMA coleta.";
  if (c.includes("orgao") || c.includes("órgão") || c.includes("orgão")) return "Regras/lista de órgãos. Afeta a classificação/coleta na PRÓXIMA rodada.";
  if (c.includes("venc") || c.includes("dias") || c.includes("janela")) return "Janelas de vencimento usadas na urgência e no score. Afeta a PRÓXIMA rodada.";
  return "Parâmetro técnico do pipeline. Em geral faz efeito na PRÓXIMA rodada de coleta/classificação — não nos dados que já estão no banco.";
}

export function ConfigEditor({ params }: { params: { chave: string; valor_json: any; descricao: string }[] }) {
  const [sel, setSel] = useState(params[0]?.chave || "");
  const cur = params.find((p) => p.chave === sel);
  const [text, setText] = useState(JSON.stringify(cur?.valor_json ?? {}, null, 2));
  const [conf, setConf] = useState(false);
  const [msg, setMsg] = useState("");
  function pick(ch: string) {
    setSel(ch); const p = params.find((x) => x.chave === ch);
    setText(JSON.stringify(p?.valor_json ?? {}, null, 2)); setMsg(""); setConf(false);
  }
  async function salvar() {
    let parsed: any;
    try { parsed = JSON.parse(text); } catch (e: any) { setMsg("JSON inválido: " + e.message); return; }
    const r = await fetch("/api/update-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave: sel, valor_json: parsed }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Salvo (backup + auditoria registrados)." : (j.error || "Falha ao salvar."));
  }
  if (params.length === 0) return <Card><CardPad>Sem parâmetros no banco. Rode o seed (`seed_atlas_b2g.sql`).</CardPad></Card>;
  return (
    <Card><CardPad>
      <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
        ⚠️ Parâmetros técnicos do pipeline (em JSON). <b>A maioria só faz efeito na próxima rodada</b> de coleta/classificação — <b>não muda os dados que já estão no banco</b>. Toda alteração gera backup + auditoria.
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Select value={sel} onChange={(e: any) => pick(e.target.value)} className="max-w-xs">
          {params.map((p) => <option key={p.chave} value={p.chave}>{p.chave}</option>)}
        </Select>
        {cur?.descricao && <span className="text-xs text-muted">{cur.descricao}</span>}
      </div>
      <div className="text-xs text-fg bg-surface2/60 border border-line rounded-lg px-3 py-2 mb-3"><b>O que isto faz:</b> {explicaImpacto(sel)}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14}
        className="w-full font-mono text-xs rounded-lg border border-line p-3" />
      {msg && <div className="text-sm mt-2 px-3 py-2 rounded-lg bg-surface2">{msg}</div>}
      <label className="text-xs text-muted mt-3 block"><input type="checkbox" checked={conf} onChange={(e) => setConf(e.target.checked)} /> Confirmo a alteração (gera backup + auditoria)</label>
      <Button className="mt-2" disabled={!conf} onClick={salvar}>💾 Salvar configuração</Button>
    </CardPad></Card>
  );
}
