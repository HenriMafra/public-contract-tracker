import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** O próprio usuário define quais órgãos (orgao_padronizado) ele acompanha (foco).
 *  Salva SOMENTE na própria linha de `perfis` (eq user_id = sessão) — service role,
 *  porque a RLS de `perfis` não permite UPDATE pelo próprio usuário. Não altera escopo
 *  de segurança (UF), apenas a preferência de foco. skip=true → salva [] (vê todos). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const orgaos = Array.isArray(b?.orgaos)
    ? Array.from(new Set(b.orgaos.map((x: any) => String(x).trim()).filter(Boolean))).slice(0, 3000)
    : [];
  // Admin/Diretoria (manage_orgaos_foco) podem editar o foco de OUTRO usuário; os demais, só o próprio.
  const alvo = (b?.target_user_id && can(user.role, "manage_orgaos_foco")) ? String(b.target_user_id) : user.id;
  try {
    const sb = supabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await sb.from("perfis")
      .update({ orgaos_foco: orgaos, onboarding_orgaos_em: now, updated_at: now })
      .eq("user_id", alvo);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: orgaos.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro." }, { status: 500 });
  }
}
