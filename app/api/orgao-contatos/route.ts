import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const digits = (s: any) => String(s || "").replace(/\D/g, "");

// Contatos por ÓRGÃO (casados pelo CNPJ). Usado no RO para:
//  - listar os contatos já registrados daquele órgão (seleção opcional);
//  - salvar um contato novo direto pelo RO, ficando registrado no órgão.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "list");
  const cnpj = digits(b.cnpj);

  // ── listar (qualquer pessoa que pode fazer RO) ──
  if (action === "list") {
    const { error } = await requireApi("ro_view");
    if (error) return error;
    if (cnpj.length !== 14) return NextResponse.json({ ok: true, contatos: [] });
    const sb = supabaseAdmin();
    const { data, error: e } = await sb.rpc("contatos_do_orgao", { p_cnpj: cnpj });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true, contatos: data || [] });
  }

  // ── criar (precisa de permissão de registrar contato) ──
  if (action === "create") {
    const { user, error } = await requireApi("register_contact");
    if (error) return error;
    const nome = String(b.pessoa_contatada || "").trim();
    if (!nome) return NextResponse.json({ error: "Nome do contato é obrigatório." }, { status: 400 });
    if (cnpj.length !== 14) return NextResponse.json({ error: "Informe o CNPJ do órgão antes de salvar o contato." }, { status: 400 });
    const sb = supabaseAdmin();
    let orgaoId: number | null = null;
    try { const { data } = await sb.rpc("orgao_id_por_cnpj", { p_cnpj: cnpj }); orgaoId = (data as any) ?? null; } catch { /* órgão não está na base — salva só pelo CNPJ */ }
    const { data: ins, error: e } = await sb.from("contatos").insert({
      orgao_id: orgaoId, cnpj_orgao: cnpj, data_contato: new Date().toISOString().slice(0, 10),
      canal: "Cadastro (RO)", pessoa_contatada: nome, cargo: b.cargo || null, email: b.email || null, telefone: b.telefone || null,
    }).select("id,pessoa_contatada,cargo,email,telefone").limit(1);
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "register_contact_orgao", detalhes: `órgão CNPJ ${cnpj}: ${nome}` });
    return NextResponse.json({ ok: true, contato: ins?.[0] || null, message: "Contato registrado no órgão." });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
