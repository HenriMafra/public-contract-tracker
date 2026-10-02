import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { getEditais } from "@/lib/queries/views";
import { LicitacoesView } from "@/components/licitacoes/LicitacoesView";
import { Expandable } from "@/components/ui/Expandable";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const SCOPED = ["Account Manager", "Sales Engineer", "Intern"]; // todo papel com UF restrita filtra editais pela sua UF

export default async function LicitacoesPage() {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;

  // Roteia os editais ao RESPONSÁVEL: escopa pela(s) UF(s) dele; foco "Meus órgãos" refina na tela.
  let ufs: string[] = []; let foco: string[] = [];
  if (SCOPED.includes(user.role)) {
    try {
      const sb = supabaseServer();
      const { data: pu } = await sb.from("perfil_ufs").select("uf").eq("user_id", user.id);
      ufs = (pu || []).map((r: any) => r.uf).filter(Boolean);
      const { data: pf } = await sb.from("perfis").select("orgaos_foco").eq("user_id", user.id).single();
      foco = Array.isArray(pf?.orgaos_foco) ? (pf!.orgaos_foco as string[]) : [];
    } catch { /* ignore */ }
  }

  const editais = await getEditais(ufs.length ? { ufs } : {});
  const sub = ufs.length
    ? `Editais públicos da sua área (${ufs.join(", ")}) — negócio NOVO. As de proposta aberta vêm primeiro.`
    : "Editais públicos (9 UFs: DF, GO, CE, SP, MT, PR, PE, AM, RS) — negócio NOVO. As de proposta aberta vêm primeiro.";

  return (
    <Shell user={user}>
      <PageTitle title="Licitações" subtitle={sub} />
      <Expandable title="Licitações">
        <LicitacoesView linhas={editais as any[]} focoOrgaos={foco} escopoUfs={ufs} />
      </Expandable>
    </Shell>
  );
}
