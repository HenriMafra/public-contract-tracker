import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { Card, CardPad, PageTitle, Empty, Badge } from "@/components/ui/primitives";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ComissionamentoForm } from "@/components/comissionamento/ComissionamentoForm";
import { TabelaComissoes } from "@/components/comissionamento/TabelaComissoes";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ComissionamentoPage() {
  const user = await requireUser();
  if (!can(user.role, "view_comissionamento")) return <Shell user={user}><Forbidden /></Shell>;
  const { data } = await supabaseAdmin().from("comissionamentos").select("*").order("criado_em", { ascending: false }).limit(50);
  const rows = data || [];
  return (
    <Shell user={user}>
      <PageTitle title="Comissionamento" subtitle="Registro de comissionamento de projetos · Enterprise IT Group. Acesso restrito a Diretoria e Administração." />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3"><CardPad><ComissionamentoForm /></CardPad></Card>
        <Card className="lg:col-span-2"><CardPad>
          <div className="flex items-center justify-between mb-3"><div className="font-bold text-fg">Últimos registros</div><Badge tone="slate">{rows.length}</Badge></div>
          {rows.length === 0 ? <Empty>Nenhum comissionamento registrado ainda.</Empty> : (
            <div className="space-y-2 max-h-[72vh] overflow-auto pr-1">
              {rows.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-line p-3 text-sm bg-surface">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-fg">Bitrix {r.id_bitrix || "—"}</span>
                    <Badge tone="navy">{r.perfil}</Badge>
                  </div>
                  <div className="text-xs text-muted mt-1">{r.tipo_projeto} · {r.margem_projeto}</div>
                  <div className="text-xs text-fg mt-1">{(r.comissionados || []).map((c: any) => `${c.nome} (${c.percentual}%)`).join(" · ") || "—"}</div>
                  <div className="text-xs text-muted mt-1">por {r.nome_preenchedor || "—"} · {fmtDate(r.criado_em)}</div>
                </div>
              ))}
            </div>
          )}
        </CardPad></Card>
      </div>
      <div className="mt-4"><TabelaComissoes /></div>
    </Shell>
  );
}
