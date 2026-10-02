import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { AutoSetupPanel } from "@/components/AutoSetupPanel";
import { DoctorPanel } from "@/components/admin/DoctorPanel";

export const dynamic = "force-dynamic";

export default async function AutomacaoPage() {
  const user = await requireUser();
  if (!can(user.role, "auto_setup")) return <Shell user={user}><Forbidden /></Shell>;
  const dbConfigured = !!process.env.DATABASE_URL && !/placeholder|sua_senha/i.test(process.env.DATABASE_URL || "");
  return (
    <Shell user={user}>
      <PageTitle title="Diagnóstico & Auto-resolver" subtitle="Se algo parecer estranho, clique em Auto-resolver: ele verifica e conserta sozinho o que dá. Roda na nuvem, é seguro e pode rodar quantas vezes quiser." />
      <div className="space-y-4">
        <DoctorPanel />
        <AutoSetupPanel dbConfigured={dbConfigured} />
      </div>
    </Shell>
  );
}
