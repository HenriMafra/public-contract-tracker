import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Card, CardPad, PageTitle, Empty, Table, Badge } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { getOrgao } from "@/lib/queries/views";
import { OrgAvatar } from "@/components/ui/OrgAvatar";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { OrgaoContratos } from "@/components/orgao/OrgaoContratos";
import { brl, fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const COL_CONTRATOS = [{ key: "numero_contrato", label: "Nº" }, { key: "objeto_original", label: "Objeto" }, { key: "categoria_principal", label: "Categoria" }, { key: "fabricante", label: "Fabricante" }, { key: "nome_fornecedor", label: "Fornecedor" }, { key: "valor_total", label: "Valor (R$)" }, { key: "fim_vigencia", label: "Término" }, { key: "status_contrato", label: "Status" }];
const COL_OPPS = [{ key: "id_oportunidade", label: "ID" }, { key: "tipo_oportunidade", label: "Tipo" }, { key: "score_comercial", label: "Score" }, { key: "urgencia_comercial", label: "Urgência" }, { key: "status_comercial", label: "Status" }];

export default async function OrgaoPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const data = await getOrgao(params.id);
  if (!data) return <Shell user={user}><Empty>Órgão não encontrado.</Empty></Shell>;
  const { org, contratos, oportunidades } = data;
  const valor = contratos.reduce((s: number, c: any) => s + Number(c.valor_total || 0), 0);
  const isAdmin = user.role === "Administrador";
  return (
    <Shell user={user}>
      <div className="flex items-center gap-3">
        <OrgAvatar name={org.nome_padronizado || org.nome_orgao} sigla={org.sigla} size={46} />
        <div className="min-w-0 flex-1"><PageTitle title={org.nome_padronizado || org.nome_orgao} subtitle={`${org.tipo || ""} · ${org.esfera || ""} · ${org.municipio}/${org.uf} · CNPJ ${org.cnpj_orgao || "—"}`} /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card><CardPad><div className="text-xs text-muted">Valor mapeado</div><div className="text-xl font-extrabold text-green-600">{brl(valor)}</div></CardPad></Card>
        <Card><CardPad><div className="text-xs text-muted">Contratos</div><div className="text-xl font-extrabold">{contratos.length}</div></CardPad></Card>
        <Card><CardPad><div className="text-xs text-muted">Oportunidades</div><div className="text-xl font-extrabold">{oportunidades.length}</div></CardPad></Card>
        <Card><CardPad><div className="text-xs text-muted">Segmento</div><div className="text-sm font-semibold mt-1">{org.segmento_presumido || "—"}</div></CardPad></Card>
      </div>

      <CollapsibleCard className="mb-4" title="Informações do órgão">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {([
            ["CNPJ", org.cnpj_orgao],
            ["Poder", org.poder],
            ["Esfera", org.esfera],
            ["Tipo", org.tipo],
            ["Área de atuação (o que faz)", org.segmento_presumido],
            ["Município / UF", [org.municipio, org.uf].filter(Boolean).join(" / ")],
            ["Unidade compradora", org.unidade_compradora],
          ] as [string, any][]).map(([k, v]) => (
            <div key={k}><div className="text-xs uppercase tracking-wide text-muted font-semibold">{k}</div><div className="text-fg font-medium mt-0.5 break-words">{v || "—"}</div></div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Tamanho (nº de funcionários) não consta nas bases públicas de compras (PNCP) — os dados acima vêm do que o órgão publica em contratos e editais.</p>
      </CollapsibleCard>

      <CollapsibleCard className="mb-4" title={`Contratos vinculados (${contratos.length})`}>
        <div className="flex justify-end mb-2"><ExportButtons rows={contratos} columns={COL_CONTRATOS} filename="atlas_contratos_orgao" /></div>
        {contratos.length === 0 ? <Empty>Sem contratos.</Empty> : <OrgaoContratos contratos={contratos} />}
      </CollapsibleCard>
      {isAdmin && (
        <CollapsibleCard title={`Oportunidades (${oportunidades.length})`}>
          <div className="flex justify-end mb-2"><ExportButtons rows={oportunidades} columns={COL_OPPS} filename="atlas_oportunidades_orgao" /></div>
          {oportunidades.length === 0 ? <Empty>Sem oportunidades.</Empty> : (
            <Table head={["ID", "Categoria", "Score", "Urgência", "Status", ""]}>
              {oportunidades.map((o: any) => (
                // Link pela PK numérica `o.id` (única) — NUNCA por `o.id_oportunidade` (código
                // tipo "ATK-00015" que se repete entre rodadas/órgãos diferentes e abria o
                // contrato errado). Bug corrigido em 2026-07-02.
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-surface2"><td className="px-3 py-2">{o.id_oportunidade}</td><td className="px-3 py-2">{o.tipo_oportunidade}</td><td className="px-3 py-2 font-bold">{o.score_comercial}</td><td className="px-3 py-2"><Badge>{o.urgencia_comercial}</Badge></td><td className="px-3 py-2">{o.status_comercial}</td><td className="px-3 py-2"><Link className="text-brand font-semibold hover:underline" href={`/oportunidades/${o.id}`}>Ver →</Link></td></tr>
              ))}
            </Table>
          )}
        </CollapsibleCard>
      )}
    </Shell>
  );
}
