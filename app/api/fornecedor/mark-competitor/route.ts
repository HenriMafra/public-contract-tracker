import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Marca um fornecedor como concorrente conhecido — ação crítica (Admin via edit_concorrentes).
// Aceita fornecedor_id OU cnpj (a tela de Fornecedores é indexada por CNPJ). Por cnpj, marca
// TODOS os cadastros da mesma RAIZ (8 primeiros dígitos = matriz/filial), igual ao agrupamento
// usado em /api/fornecedor. Migrado do antigo /api/radar/mark-competitor.
export async function POST(req: Request) {
  const { user, error } = await requireApi("edit_concorrentes");
  if (error) {
    if (user) await audit({ usuario: (user as any).nome || (user as any).email, perfil: user.role, acao: "mark_competitor", resultado: "NEGADO" });
    return error;
  }
  const b = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const patch = {
    concorrente_conhecido: b.conhecido !== false,
    possivel_concorrente: true,
    grau_ameaca: b.grau_ameaca || "Alto",
    updated_at: new Date().toISOString(),
  };
  let qb: any = sb.from("fornecedores").update(patch);
  let alvo = "";
  if (b.fornecedor_id) {
    qb = qb.eq("id", b.fornecedor_id);
    alvo = `id ${b.fornecedor_id}`;
  } else if (b.cnpj) {
    const raiz = String(b.cnpj).replace(/\D/g, "").slice(0, 8);
    if (raiz.length < 6) return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
    qb = qb.ilike("cnpj_fornecedor", `${raiz}%`);
    alvo = `cnpj-raiz ${raiz}`;
  } else {
    return NextResponse.json({ error: "Informe fornecedor_id ou cnpj." }, { status: 400 });
  }
  const { error: e } = await qb;
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  await audit({ usuario: (user as any).nome || (user as any).email, perfil: user!.role, acao: "mark_competitor", detalhes: `fornecedor ${alvo}`, resultado: "OK" });
  return NextResponse.json({ ok: true, message: "Fornecedor marcado como concorrente conhecido." });
}
