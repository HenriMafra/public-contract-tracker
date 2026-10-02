import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** AUTO-RESOLVEDOR: roda a bateria de verificações+correções (função atlas_doctor no
 *  banco) e devolve o relatório. Roda na NUVEM (service role), sem depender de PC. */
export async function POST() {
  const { user, error } = await requireApi("auto_setup");
  if (error) return error;
  try {
    const sb = supabaseAdmin();
    const { data, error: e } = await sb.rpc("atlas_doctor");
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "auto_resolver", detalhes: "rodou o auto-resolver (atlas_doctor)" });
    return NextResponse.json({ ok: true, report: Array.isArray(data) ? data : [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao rodar o auto-resolver." }, { status: 500 });
  }
}
