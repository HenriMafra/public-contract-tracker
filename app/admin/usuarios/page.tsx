import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { UserManager } from "@/components/UserManager";
import { supabaseAdminFull as supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await requireUser();
  if (!can(user.role, "manage_users")) return <Shell user={user}><Forbidden /></Shell>;

  let users: any[] = [];
  let orgaos: { id: number; nome: string; uf: string }[] = [];
  try {
    const sb = supabaseAdmin();
    const { data: auth } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const { data: perfis } = await sb.from("perfis").select("user_id,role,nome,ativo");
    const { data: po } = await sb.from("perfil_orgaos").select("user_id,orgao_id");
    const { data: pufs } = await sb.from("perfil_ufs").select("user_id,uf");
    const { data: orgs } = await sb.from("orgaos").select("id,nome_padronizado,nome_orgao,uf").order("nome_padronizado").limit(5000);

    const emailById: Record<string, string> = {};
    (auth?.users || []).forEach((u: any) => { emailById[u.id] = u.email || ""; });
    const orgsByUser: Record<string, number[]> = {};
    (po || []).forEach((r: any) => { (orgsByUser[r.user_id] ||= []).push(r.orgao_id); });
    const ufsByUser: Record<string, string[]> = {};
    (pufs || []).forEach((r: any) => { (ufsByUser[r.user_id] ||= []).push(r.uf); });

    users = (perfis || []).map((p: any) => ({
      ...p, email: emailById[p.user_id] || "(sem e-mail)", orgaos: orgsByUser[p.user_id] || [], ufs: ufsByUser[p.user_id] || [],
    })).sort((a: any, b: any) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1));
    orgaos = (orgs || []).map((o: any) => ({ id: o.id, nome: o.nome_padronizado || o.nome_orgao || `Órgão ${o.id}`, uf: o.uf || "" }));
  } catch { /* sem banco */ }

  return (
    <Shell user={user}>
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-fg">Usuários e Acessos</h1>
        <p className="text-sm text-muted mt-1">
          Crie pessoas (e-mail + senha + nome + papel) — vai direto pro banco e elas já entram.
          Por padrão <b>todo mundo vê tudo</b>. Se você definir uma <b>localização</b> (UF) para alguém
          (botão “Localização” na lista), essa pessoa passa a ver <b>só os órgãos daquela UF</b>. Só a
          <b> área de Admin</b> (Usuários, Operação, etc.) é sua, como Administrador. Ações auditadas.
        </p>
      </div>
      <UserManager users={users} orgaos={orgaos} currentUserId={user.id} />
    </Shell>
  );
}
