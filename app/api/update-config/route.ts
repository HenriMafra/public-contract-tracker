import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { user, error } = await requireApi("edit_config_comercial");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  if (!b.chave) return NextResponse.json({ error: "Informe a chave." }, { status: 400 });
  // chaves sensíveis exigem Administrador
  const sensivel = /score|concorrent|responsav|janela|peso/i.test(b.chave);
  if (sensivel && user!.role !== "Administrador")
    return NextResponse.json({ error: "Acesso negado. Esta configuração exige perfil Administrador." }, { status: 403 });
  const sb = supabaseAdmin();
  const { data: old } = await sb.from("parametros_sistema").select("valor_json").eq("chave", b.chave).limit(1);
  const { error: e } = await sb.from("parametros_sistema")
    .upsert({ chave: b.chave, valor_json: b.valor_json, updated_at: new Date().toISOString() }, { onConflict: "chave" });
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  // backup/diff via auditoria (antes/depois)
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "edit_config", detalhes: `chave ${b.chave}`, parametros: { antes: old?.[0]?.valor_json, depois: b.valor_json } });
  return NextResponse.json({ ok: true, message: "Configuração atualizada (auditada)." });
}
