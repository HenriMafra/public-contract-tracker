import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications/actions";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { user, error } = await requireApi("assign_vendor");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  if (!b.oportunidade_id || !b.responsavel) return NextResponse.json({ error: "Informe oportunidade_id e responsavel." }, { status: 400 });
  const { error: e } = await supabaseAdmin().from("oportunidades")
    .update({ responsavel_atribuido: b.responsavel, updated_at: new Date().toISOString() })
    .eq("id", b.oportunidade_id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "assign_vendor", detalhes: `opp ${b.oportunidade_id} → ${b.responsavel}` });
  // notifica o vendedor (persistente, respeita RLS na leitura)
  await createNotifications([{
    tipo: "opportunity_assigned", nivel: "info", escopo: "user",
    titulo: "Nova oportunidade atribuída a você",
    mensagem: `${b.orgao || "Oportunidade"} — próxima ação: ${b.proxima_acao || "definir abordagem"}.`,
    responsavel_destino: b.responsavel, oportunidade_id: b.oportunidade_id,
    link_url: b.oportunidade_id ? `/oportunidades/${b.oportunidade_id}` : null, criada_por: user!.email,
  }]);
  return NextResponse.json({ ok: true, message: `Oportunidade atribuída a ${b.responsavel}.` });
}
