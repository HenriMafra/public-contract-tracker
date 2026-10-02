import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Card, CardPad, Table, PageTitle, Empty, Badge } from "@/components/ui/primitives";
import { getPorResponsavel, getListaAtaque } from "@/lib/queries/views";
import { brlMi, brl, corUrgencia } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DistribuicaoPage() {
  const user = await requireUser();
  if (!can(user.role, "distribute")) return <Shell user={user}><Forbidden /></Shell>;
  const [resp, lista] = await Promise.all([getPorResponsavel(), getListaAtaque({})]);
  const semDono = (lista || []).filter((o: any) => !o.responsavel_atribuido);
  return (
    <Shell user={user}>
      <PageTitle title="Distribuição Comercial" subtitle="Reparta a lista de ataque por responsável e cubra os órfãos." />
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card><CardPad>
          <div className="font-bold text-fg mb-2">Por responsável</div>
          {(resp || []).length === 0 ? <Empty>—</Empty> : (
            <Table head={["Responsável", "Oport.", "Críticas", "Valor"]}>
              {resp.map((r: any, i: number) => (
                <tr key={i} className="border-b border-line"><td className="px-3 py-1.5 font-medium">{r.responsavel || "—"}</td><td className="px-3 py-1.5">{r.qtd}</td><td className="px-3 py-1.5 text-red-600">{r.criticas}</td><td className="px-3 py-1.5 font-semibold">{brlMi(r.valor_total)}</td></tr>
              ))}
            </Table>
          )}
        </CardPad></Card>
        <Card><CardPad>
          <div className="font-bold text-fg mb-2">Sem responsável atribuído <Badge className="bg-amber-100 text-amber-800">{semDono.length}</Badge></div>
          {semDono.length === 0 ? <Empty>Todas atribuídas.</Empty> : (
            <Table head={["Órgão", "UF", "Sugerido", "Score", ""]}>
              {semDono.slice(0, 30).map((o: any) => (
                <tr key={o.id} className="border-b border-line"><td className="px-3 py-1.5 font-semibold max-w-[180px] truncate">{o.orgao_padronizado}</td><td className="px-3 py-1.5">{o.uf}</td><td className="px-3 py-1.5 text-muted text-xs">{o.responsavel_sugerido}</td><td className="px-3 py-1.5 font-extrabold">{o.score_comercial}</td><td className="px-3 py-1.5"><Link className="text-brand hover:underline" href={`/oportunidades/${o.id ?? o.id_oportunidade}`}>Atribuir</Link></td></tr>
              ))}
            </Table>
          )}
        </CardPad></Card>
      </div>
      <p className="text-xs text-muted">Para atribuir/registrar contato, abra a ficha da oportunidade. As ações são auditadas.</p>
    </Shell>
  );
}
