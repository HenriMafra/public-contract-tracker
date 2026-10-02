import { supabaseAdmin } from "@/lib/supabase/admin";

// Quadro do backlog (cartões não arquivados) + comentários agrupados. Acesso via service-role.
export async function getBacklog() {
  try {
    const sb = supabaseAdmin();
    const { data: cards } = await sb.from("backlog_cards").select("*").eq("arquivado", false).order("coluna").order("ordem").order("id").limit(3000);
    const ids = (cards || []).map((c: any) => c.id);
    let coms: any[] = [];
    if (ids.length) { const { data } = await sb.from("backlog_comentarios").select("*").in("card_id", ids).order("id"); coms = data || []; }
    const byCard: Record<number, any[]> = {};
    coms.forEach((c: any) => { (byCard[c.card_id] ||= []).push(c); });
    return (cards || []).map((c: any) => ({ ...c, comentarios: byCard[c.id] || [] }));
  } catch { return []; }
}

// Usuários ativos (para escolher responsáveis/membros). id = user_id.
export async function getUsuariosAtivos() {
  try {
    const { data } = await supabaseAdmin().from("perfis").select("user_id, nome, role").eq("ativo", true).order("nome");
    return (data || []).map((u: any) => ({ id: u.user_id, nome: u.nome || "—", role: u.role }));
  } catch { return []; }
}
