import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checarEscopoOpps } from "@/lib/auth/escopo";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { user, error } = await requireApi("register_contact");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  if (!b.oportunidade_id) return NextResponse.json({ error: "Informe oportunidade_id." }, { status: 400 });
  const esc = await checarEscopoOpps(user!, [b.oportunidade_id]);
  if (!esc.ok) return NextResponse.json({ error: "Sem permissão: contrato fora da sua UF." }, { status: 403 });
  const sb = supabaseAdmin();
  const { data: opp } = await sb.from("oportunidades").select("orgao_id").eq("id", b.oportunidade_id).limit(1);
  if (b.pessoa_contatada !== undefined && !String(b.pessoa_contatada).trim())
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  const { error: e } = await sb.from("contatos").insert({
    oportunidade_id: b.oportunidade_id, orgao_id: opp?.[0]?.orgao_id ?? null,
    data_contato: new Date().toISOString().slice(0, 10), canal: b.canal || "Cadastro",
    pessoa_contatada: b.pessoa_contatada || "", cargo: b.cargo || "", resumo: b.resumo || "",
    resultado: b.resultado || "", proxima_acao: b.proxima_acao || "",
    telefone: b.telefone || null, email: b.email || null,
  });
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "register_contact", detalhes: `opp ${b.oportunidade_id}: ${b.pessoa_contatada || ""}` });
  return NextResponse.json({ ok: true, message: "Contato registrado." });
}
