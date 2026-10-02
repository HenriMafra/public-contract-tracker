import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle, Empty } from "@/components/ui/primitives";
import { DecisoesView } from "@/components/decisoes/DecisoesView";
import { QualidadeTable } from "@/components/qualidade/QualidadeTable";
import { getDecididas, getQualidade } from "@/lib/queries/views";
import { Inbox, ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DecisoesPage() {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const verQualidade = can(user.role, "view_qualidade");
  const [rows, itens] = await Promise.all([
    getDecididas(),
    verQualidade ? getQualidade() : Promise.resolve([] as any[]),
  ]);
  const lista = (itens as any[]) || [];
  const precisam = lista.filter((o: any) => o.necessita_revisao).length;

  return (
    <Shell user={user}>
      <PageTitle
        title="Decisões & Qualidade"
        subtitle="Em cima: o que chegou da Lista de Ataque e ainda precisa de conferência. Embaixo: para onde foi cada decisão — Validadas viram carteira; Descartadas ficam guardadas (com quem decidiu e quando) e podem voltar. Clique numa linha para abrir."
      />

      {verQualidade && (
        <section className="mb-7">
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={18} className="text-brand shrink-0" />
            <h2 className="text-base font-bold text-fg">Para revisar</h2>
            {precisam > 0 && <span className="text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-full px-2 py-0.5">{precisam} precisam de revisão</span>}
          </div>
          <p className="text-xs text-muted mb-2.5">Itens que entraram da Lista e ainda precisam de validação humana antes da abordagem. Ao decidir um deles, ele passa para o grupo certo em “Suas decisões”, abaixo.</p>
          {lista.length === 0 ? <Empty>Nenhuma pendência de revisão na rodada atual. 🎉</Empty> : <QualidadeTable itens={lista} />}
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={18} className="text-brand shrink-0" />
          <h2 className="text-base font-bold text-fg">Suas decisões</h2>
        </div>
        <p className="text-xs text-muted mb-2.5">Cada decisão tomada (na Lista de Ataque ou aqui em cima) aparece no grupo correspondente.</p>
        <DecisoesView rows={(rows as any[]) || []} canReset={can(user.role, "reset_decisao")} />
      </section>
    </Shell>
  );
}
