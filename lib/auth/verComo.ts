import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/guard";

export const VER_COMO_COOKIE = "atlas_ver_como";

export type VerComo = { userId: string; nome: string; role: string; ufs: string[]; veTudo: boolean };

/**
 * Se o admin ativou "Ver como" (cookie), retorna o escopo do usuário-alvo para
 * SIMULAR o que ele vê (o admin não é escopado pela RLS, então filtramos no app).
 * Escopo = UF (perfil_ufs). Sem nenhuma UF definida → vê tudo. Só vale p/ Administrador.
 * Filtramos pela coluna `uf` das views — robusto, não depende de casar nome de órgão.
 */
export async function escopoVerComo(): Promise<VerComo | null> {
  const alvo = cookies().get(VER_COMO_COOKIE)?.value;
  if (!alvo) return null;
  const me = await getCurrentUser();
  if (!me || me.role !== "Administrador") return null; // só o admin pode pré-visualizar
  try {
    const sb = supabaseAdmin();
    const { data: p } = await sb.from("perfis").select("role,nome").eq("user_id", alvo).single();
    if (!p) return null;
    if (p.role === "Administrador") {
      return { userId: alvo, nome: p.nome || "", role: p.role, ufs: [], veTudo: true };
    }
    const { data: pufs } = await sb.from("perfil_ufs").select("uf").eq("user_id", alvo);
    const ufs = (pufs || []).map((r: any) => r.uf).filter(Boolean);
    const veTudo = ufs.length === 0; // sem UF definida = vê tudo
    return { userId: alvo, nome: p.nome || "", role: p.role, ufs, veTudo };
  } catch { return null; }
}
