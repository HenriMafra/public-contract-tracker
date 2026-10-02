import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { OrgaosEquipe } from "@/components/admin/OrgaosEquipe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Admin + Diretoria definem o FOCO de órgãos de cada pessoa (preferência da Lista de Ataque).
// Cada usuário também ajusta o próprio em "Minha Conta". O escopo de SEGURANÇA (UF) é à parte (Admin→Usuários).
export default async function OrgaosEquipePage() {
  const user = await requireUser();
  if (!can(user.role, "manage_orgaos_foco")) return <Shell user={user}><Forbidden /></Shell>;

  let users: any[] = [];
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("perfis").select("user_id,nome,role,ativo,orgaos_foco").order("ativo", { ascending: false }).order("nome");
    users = (data || []).map((p: any) => ({
      user_id: p.user_id, nome: p.nome || "(sem nome)", role: p.role, ativo: !!p.ativo,
      foco: Array.isArray(p.orgaos_foco) ? p.orgaos_foco : [],
    }));
  } catch { /* sem banco */ }

  return (
    <Shell user={user}>
      <PageTitle
        title="Órgãos da equipe"
        subtitle="Defina o foco de órgãos de cada pessoa (quais órgãos aparecem por padrão na Lista de Ataque dela). Cada um também ajusta o próprio em Minha Conta. Acesso restrito a Admin e Diretoria."
      />
      <OrgaosEquipe users={users} />
    </Shell>
  );
}
