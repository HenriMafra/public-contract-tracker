import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checarEscopoOpps } from "@/lib/auth/escopo";
export const dynamic = "force-dynamic";

// Gerencia contatos de uma oportunidade: criar / editar / excluir. Nome obrigatório.
export async function POST(req: Request) {
  const { user, error } = await requireApi("register_contact");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "create");
  const sb = supabaseAdmin();
  // Escopo por UF: resolve a oportunidade do contato (create=oportunidade_id; update/delete=via id do contato).
  let oppEsc = Number(b.oportunidade_id) || 0;
  if (!oppEsc && b.id) { const { data: ct } = await sb.from("contatos").select("oportunidade_id").eq("id", b.id).limit(1); oppEsc = Number(ct?.[0]?.oportunidade_id) || 0; }
  if (oppEsc) { const esc = await checarEscopoOpps(user!, [oppEsc]); if (!esc.ok) return NextResponse.json({ error: "Sem permissão: contato fora da sua UF." }, { status: 403 }); }

  if (action === "delete") {
    if (!b.id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
    const { error: e } = await sb.from("contatos").delete().eq("id", b.id);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "delete_contact", detalhes: `removeu contato ${b.id}` });
    return NextResponse.json({ ok: true, message: "Contato removido." });
  }

  const nome = String(b.pessoa_contatada || "").trim();
  if (!nome) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  const campos = { pessoa_contatada: nome, telefone: b.telefone || null, email: b.email || null, resumo: b.resumo || null };

  if (action === "update") {
    if (!b.id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });
    const { error: e } = await sb.from("contatos").update(campos).eq("id", b.id);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "update_contact", detalhes: `editou contato ${b.id}` });
    return NextResponse.json({ ok: true, message: "Contato atualizado." });
  }

  // create
  if (!b.oportunidade_id) return NextResponse.json({ error: "oportunidade_id obrigatório." }, { status: 400 });
  const { data: opp } = await sb.from("oportunidades").select("orgao_id").eq("id", b.oportunidade_id).limit(1);
  const { error: e } = await sb.from("contatos").insert({
    oportunidade_id: b.oportunidade_id, orgao_id: opp?.[0]?.orgao_id ?? null,
    data_contato: new Date().toISOString().slice(0, 10), canal: "Cadastro", ...campos,
  });
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "register_contact", detalhes: `opp ${b.oportunidade_id}: ${nome}` });
  return NextResponse.json({ ok: true, message: "Contato adicionado." });
}
