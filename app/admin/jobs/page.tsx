import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { JobsPanel } from "@/components/admin/JobsPanel";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requireUser();
  if (!can(user.role, "view_rodadas")) return <Shell user={user}><Forbidden /></Shell>;
  return (
    <Shell user={user}>
      <PageTitle title="Jobs (Fila de Execução)" subtitle="Execução assíncrona via worker: progresso, logs e artefatos em tempo real. Cancelar e reprocessar com RBAC + auditoria." />
      <JobsPanel canCancel={can(user.role, "run_test")} />
    </Shell>
  );
}
