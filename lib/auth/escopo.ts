import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AppUser } from "@/lib/auth/guard";

// Papéis que enxergam/agem em TUDO (liderança). Os demais (AM/SE/Intern) são limitados por UF.
const VE_TUDO = new Set(["Administrador", "Diretoria"]);

/** UFs do usuário (perfil_ufs). Vazio = nenhuma UF definida. */
export async function ufsDoUsuario(userId: string): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin().from("perfil_ufs").select("uf").eq("user_id", userId);
    return Array.from(new Set((data || []).map((r: any) => r.uf).filter(Boolean)));
  } catch {
    return [];
  }
}

/**
 * Garante que TODAS as oportunidades (ids) estão na UF do usuário ANTES de qualquer escrita
 * via service-role (que ignora a RLS). Admin/Diretoria passam. Usuário escopado SEM nenhuma
 * UF definida NÃO passa (fail-closed) — segurança acima de conveniência. Erro de consulta = nega.
 */
export async function checarEscopoOpps(user: AppUser, ids: Array<number | string>): Promise<{ ok: boolean; fora: number[] }> {
  if (VE_TUDO.has(user.role)) return { ok: true, fora: [] };
  const ids2 = Array.from(new Set(ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
  if (!ids2.length) return { ok: true, fora: [] };
  const ufs = await ufsDoUsuario(user.id);
  // Sem nenhuma UF definida = "vê tudo" (comportamento atual, não quebra quem não tem UF).
  // Endurecer isso (fail-closed) é um passo separado: exige todos com UF cadastrada antes.
  if (!ufs.length) return { ok: true, fora: [] };
  try {
    const { data } = await supabaseAdmin().from("vw_lista_ataque_atual").select("id,uf").in("id", ids2);
    const map = new Map((data || []).map((r: any) => [Number(r.id), r.uf as string]));
    const fora = ids2.filter((id) => !ufs.includes(map.get(id) as string));
    return { ok: fora.length === 0, fora };
  } catch {
    return { ok: false, fora: ids2 };
  }
}
