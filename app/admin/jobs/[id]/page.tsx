import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle, Card, CardPad } from "@/components/ui/primitives";
import { JobStatusCard } from "@/components/admin/JobStatusCard";
import { JobLogsViewer } from "@/components/admin/JobLogsViewer";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!can(user.role, "view_rodadas")) return <Shell user={user}><Forbidden /></Shell>;
  const showLogs = can(user.role, "view_logs"); // Admin / Operador
  return (
    <Shell user={user}>
      <PageTitle title={`Job #${params.id}`} subtitle="Status, progresso, logs e artefatos — atualizado automaticamente." />
      <div className="space-y-4">
        <JobStatusCard jobId={params.id} canReupload={can(user.role, "run_test")} />
        {showLogs && (
          <Card><CardPad>
            <div className="font-bold text-fg mb-2">Logs do job</div>
            <JobLogsViewer jobId={params.id} active={true} />
          </CardPad></Card>
        )}
      </div>
    </Shell>
  );
}
