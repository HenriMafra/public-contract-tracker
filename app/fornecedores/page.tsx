import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { getConcorrentes } from "@/lib/queries/views";
import { FornecedoresView } from "@/components/FornecedoresView";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const concs = (await getConcorrentes()) as any[] || [];
  return (
    <Shell user={user}>
      <PageTitle title="Fornecedores & Concorrentes" subtitle="Clique num fornecedor para abrir os contratos dele, agrupados por órgão — análise minuciosa. ★ = concorrente conhecido." />
      <FornecedoresView fornecedores={concs} canMark={can(user.role, "edit_concorrentes")} />
    </Shell>
  );
}
