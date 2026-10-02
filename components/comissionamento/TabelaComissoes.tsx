import { Fragment } from "react";
import { Card, CardPad } from "@/components/ui/primitives";
import { ScrollboxTop } from "@/components/ui/ScrollboxTop";

// Tabela de Comissões · Enterprise IT Group — alíquotas por equipe / tipo de venda / faixa de MC.
// Transcrita do PDF oficial (Tabela_Comissoes_ENTERPRISECORE.pdf) do app antigo.
const COLS = ["De 16,80% à 19,99%", "De 20% à 25%", "De 25% à 30%", "Acima de 30%"];

const GRUPOS: { titulo: string; linhas: string[][] }[] = [
  { titulo: "Vendedores", linhas: [
    ["Vendas de produtos Check Point", "0,50%", "0,80%", "1,10%", "1,50%"],
    ["Vendas de outros Produtos", "0,60%", "0,90%", "1,20%", "1,60%"],
    ["Vendas de Solução", "0,70%", "1,00%", "1,30%", "1,70%"],
    ["Renovações", "0,30%", "0,45%", "0,60%", "0,80%"],
  ] },
  { titulo: "Pré vendas", linhas: [
    ["Vendas de produtos Check Point", "0,25%", "0,40%", "0,55%", "0,75%"],
    ["Vendas de outros Produtos", "0,30%", "0,45%", "0,60%", "0,80%"],
    ["Vendas de Solução", "0,35%", "0,50%", "0,65%", "0,85%"],
    ["Renovações", "0,15%", "0,23%", "0,30%", "0,40%"],
  ] },
  { titulo: "Gerente de Pré vendas / Comercial", linhas: [
    ["Todas as vendas", "0,07%", "0,10%", "0,11%", "0,13%"],
    ["SOC e Tecnologias emergentes em fabricantes estratégicos", "0,00%", "0,09%", "0,11%", "0,13%"],
  ] },
  { titulo: "Licitação / Assistente de vendas", linhas: [
    ["Todas as vendas", "0,10%", "0,10%", "0,10%", "0,10%"],
  ] },
];

export function TabelaComissoes() {
  return (
    <Card>
      <CardPad>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="font-bold text-fg">Tabela de Comissões · Enterprise IT Group</div>
          <span className="text-xs text-muted">alíquotas por equipe · tipo de venda · faixa de margem (MC)</span>
        </div>
        <ScrollboxTop boxClass="rounded-xl border border-line">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-brand text-white">
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">MC</th>
                {COLS.map((c) => <th key={c} className="px-3 py-2 font-semibold text-center whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((g) => (
                <Fragment key={g.titulo}>
                  <tr className="bg-surface2"><td colSpan={5} className="px-3 py-1.5 font-bold text-fg whitespace-nowrap">{g.titulo}</td></tr>
                  {g.linhas.map((ln, i) => (
                    <tr key={i} className="border-t border-line hover:bg-surface2/40">
                      <td className="px-3 py-1.5 text-fg whitespace-nowrap">{ln[0]}</td>
                      {ln.slice(1).map((v, j) => <td key={j} className="px-3 py-1.5 text-center tabular-nums whitespace-nowrap font-medium">{v}</td>)}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </ScrollboxTop>
        <div className="text-xs text-muted mt-2">As 3 primeiras faixas são <b>dentro da cota</b>; “Acima de 30%” = <b>acima da cota</b>. MC = Margem de Contribuição.</div>
      </CardPad>
    </Card>
  );
}
