import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checarEscopoOpps } from "@/lib/auth/escopo";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { user, error } = await requireApi("validate_opportunity");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  if (!b.oportunidade_id || !b.status_validacao) return NextResponse.json({ error: "Informe oportunidade_id e status_validacao." }, { status: 400 });
  const esc = await checarEscopoOpps(user!, [b.oportunidade_id]);
  if (!esc.ok) return NextResponse.json({ error: "Sem permissão: contrato fora da sua UF." }, { status: 403 });
  const sb = supabaseAdmin();
  const patch: any = { status_validacao: b.status_validacao, updated_at: new Date().toISOString() };
  if (b.status_validacao === "Validada") patch.necessita_revisao = false;
  const { error: e } = await sb.from("oportunidades").update(patch).eq("id", b.oportunidade_id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  try { await sb.from("revisoes").update({ status: "Resolvida", resolvido_em: new Date().toISOString(), responsavel_revisao: user!.email, resultado: b.status_validacao }).eq("oportunidade_id", b.oportunidade_id); } catch {}
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "validate_opportunity", detalhes: `opp ${b.oportunidade_id} → ${b.status_validacao}` });
  return NextResponse.json({ ok: true, message: `Oportunidade marcada como ${b.status_validacao}.` });
}
