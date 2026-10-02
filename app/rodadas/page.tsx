import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Table, PageTitle, Empty, Badge } from "@/components/ui/primitives";
import { getHistoricoRodadas } from "@/lib/queries/views";
import { brlMi, fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function RodadasPage() {
  const user = await requireUser();
  if (!can(user.role, "view_rodadas")) return <Shell user={user}><Forbidden /></Shell>;
  const rod = await getHistoricoRodadas();
  return (
    <Shell user={user}>
      <PageTitle title="Atualizações da base" subtitle="Cada linha é uma atualização automática dos dados. Veja quando foi a última coleta e o que ela trouxe." />
      <div className="mb-4 rounded-xl border border-line bg-surface2/40 p-3.5 text-sm text-muted leading-relaxed">
        <b className="text-fg">O que é isto?</b> Toda vez que o robô coleta os dados do PNCP, ele salva uma <b className="text-fg">“foto” datada</b> de tudo — chamamos de <b className="text-fg">atualização (ou “rodada”)</b>. O site sempre mostra a <b className="text-fg">mais recente</b>. Esta tela serve para você <b className="text-fg">saber quando os dados foram atualizados pela última vez</b>, quantas oportunidades vieram e comparar com as anteriores. É tudo automático — você não precisa fazer nada aqui.
      </div>
      {(rod || []).length === 0 ? <Empty>Nenhuma rodada registrada no banco ainda.</Empty> : (
        <Table head={["Data", "Tag", "Tipo", "Status", "Oportunidades", "Críticas", "Valor total", "Snapshots", "Pacote"]}>
          {rod.map((r: any, i: number) => (
            <tr key={i} className="border-b border-line hover:bg-surface2">
              <td className="px-3 py-2 font-semibold">{fmtDate(r.data_rodada)}</td>
              <td className="px-3 py-2"><Badge>{r.tag || "—"}</Badge></td>
              <td className="px-3 py-2 text-muted">{r.tipo}</td>
              <td className="px-3 py-2">{r.status_execucao}</td>
              <td className="px-3 py-2">{r.total_oportunidades}</td>
              <td className="px-3 py-2 text-red-600 font-semibold">{r.total_criticas}</td>
              <td className="px-3 py-2 font-semibold">{brlMi(r.valor_total_mapeado)}</td>
              <td className="px-3 py-2">{r.snapshots}</td>
              <td className="px-3 py-2 text-muted text-xs">{r.caminho_pacote || "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </Shell>
  );
}
