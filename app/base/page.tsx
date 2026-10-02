import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Card, CardPad, PageTitle, Empty } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { getBaseNtsec, getPorFabricante } from "@/lib/queries/views";
import { brl } from "@/lib/utils/format";
import type { Col } from "@/lib/utils/export";
import { TerrenoConquistadoView } from "@/components/base/TerrenoConquistadoView";

export const dynamic = "force-dynamic";

const EXPORT_COLS: Col[] = [
  { key: "orgao_padronizado", label: "Órgão" }, { key: "uf", label: "UF" }, { key: "categoria_principal", label: "Solução" },
  { key: "objeto_original", label: "Objeto" }, { key: "valor_total", label: "Valor (R$)" },
  { key: "dias_ate_vencimento", label: "Dias p/ vencer" }, { key: "fim_vigencia", label: "Fim vigência" }, { key: "id_oportunidade", label: "ID" },
];

export default async function BasePage() {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const [rowsRaw, cpRaw] = await Promise.all([getBaseNtsec(), getPorFabricante("Check Point")]);
  const rows: any[] = (rowsRaw as any[]) || [];
  const checkpoint: any[] = (cpRaw as any[]) || [];
  const aVencer = rows.filter((r) => typeof r.dias_ate_vencimento === "number" && r.dias_ate_vencimento >= 0 && r.dias_ate_vencimento <= 180);
  const vigentes = rows.filter((r) => typeof r.dias_ate_vencimento === "number" && r.dias_ate_vencimento > 180);
  const vencidos = rows.filter((r) => typeof r.dias_ate_vencimento === "number" && r.dias_ate_vencimento < 0);
  const valorTotal = rows.reduce((s, r) => s + (Number(r.valor_total) || 0), 0);
  const vazio = rows.length === 0 && checkpoint.length === 0;

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <PageTitle title="Terreno Conquistado" subtitle="Contratos onde a ENTERPRISECORE já é a fornecedora — o que está vigente e o que está perto de vencer (para renovar)." />
        {rows.length > 0 && <ExportButtons rows={rows} columns={EXPORT_COLS} filename="base_enterprisecore" />}
      </div>

      {vazio ? (
        <Card><CardPad><Empty>Nenhum contrato da ENTERPRISECORE nesta visão ainda. (À medida que o backfill carrega o histórico, mais contratos aparecem aqui.)</Empty></CardPad></Card>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {[["Contratos ENTERPRISECORE", rows.length], ["A vencer (até 180 dias)", aVencer.length], ["Vigentes", vigentes.length], ["Valor total", brl(valorTotal)]].map(([k, v]: any) => (
                <div key={k} className="rounded-xl border border-line bg-surface px-3 py-2.5 shadow-soft">
                  <div className="text-xs uppercase tracking-wide text-muted font-semibold">{k}</div>
                  <div className="text-lg font-extrabold text-fg mt-0.5 whitespace-nowrap truncate">{v}</div>
                </div>
              ))}
            </div>
          )}
          <TerrenoConquistadoView rows={rows} checkpoint={checkpoint} />
        </>
      )}
    </Shell>
  );
}
