import Link from "next/link";
import { requireUser, nomeResponsavel } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Card, CardPad, Empty, PageTitle } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { getMeusContratos } from "@/lib/queries/views";
import { escopoVerComo } from "@/lib/auth/verComo";
import { brl } from "@/lib/utils/format";
import type { Col } from "@/lib/utils/export";
import { PainelTaticoView } from "@/components/meus-contratos/PainelTaticoView";

export const dynamic = "force-dynamic";

const EXPORT_COLS: Col[] = [
  { key: "orgao_padronizado", label: "Órgão" }, { key: "uf", label: "UF" }, { key: "categoria_principal", label: "Solução" },
  { key: "objeto_original", label: "Objeto" }, { key: "valor_total", label: "Valor (R$)" },
  { key: "dias_ate_vencimento", label: "Dias p/ vencer" }, { key: "fim_vigencia", label: "Fim vigência" },
  { key: "status_comercial", label: "Andamento" }, { key: "status_validacao", label: "Decisão" },
  { key: "proxima_acao_recomendada", label: "Próxima ação" }, { key: "id_oportunidade", label: "ID" },
];

export default async function MeusContratosPage() {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const vc = await escopoVerComo();
  const meu = vc ? vc.nome : nomeResponsavel(user);
  const rows: any[] = (await getMeusContratos(meu)) as any[] || [];

  const total = rows.length;
  const valorTotal = rows.reduce((s, r) => s + (Number(r.valor_total) || 0), 0);
  const negociando = rows.filter((r) => r.status_comercial === "Em negociação").length;
  const ativos = rows.filter((r) => !["Fechado", "Perdido", "Descartado"].includes(r.status_comercial)).length;

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <PageTitle title="Painel Tático" subtitle="Os contratos que você assumiu, organizados pelo andamento. Clique para abrir e atualizar." />
        {total > 0 && <ExportButtons rows={rows} columns={EXPORT_COLS} filename="meus_contratos" />}
      </div>

      {total === 0 ? (
        <Card><CardPad>
          <Empty>
            Você ainda não assumiu nenhum contrato.<br />
            Vá à <Link href="/lista-ataque" className="text-brand font-semibold hover:underline">Lista de Ataque</Link>, abra um contrato e clique em <b>“Assumir contrato”</b> — ele aparece aqui.
          </Empty>
        </CardPad></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {[["Contratos meus", total], ["Ativos no funil", ativos], ["Negociando", negociando], ["Valor total", brl(valorTotal)]].map(([k, v]: any) => (
              <div key={k} className="rounded-xl border border-line bg-surface px-3 py-2.5 shadow-soft">
                <div className="text-xs uppercase tracking-wide text-muted font-semibold">{k}</div>
                <div className="text-lg font-extrabold text-fg mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          <PainelTaticoView rows={rows} />
        </>
      )}
    </Shell>
  );
}
