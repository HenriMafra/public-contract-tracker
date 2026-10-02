import { requireUser, nomeResponsavel } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { RelatorioView } from "@/components/relatorios/RelatorioView";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const user = await requireUser();
  if (!can(user.role, "open_files")) return <Shell user={user}><Forbidden /></Shell>;
  const hoje = new Date().toLocaleDateString("pt-BR");

  // Números calculados no SERVIDOR (RPC com RLS do usuário) — leve e confiável, sem puxar 122k linhas.
  let data: any = null;
  try {
    const { data: r } = await supabaseServer().rpc("mapper_relatorio");
    data = r || null;
  } catch { data = null; }

  return (
    <Shell user={user}>
      <PageTitle title="Relatórios" subtitle="Documento executivo da sua base — pronto para ler, salvar em PDF ou baixar em Excel." />
      <RelatorioView data={data} nome={nomeResponsavel(user)} hoje={hoje} />
    </Shell>
  );
}
