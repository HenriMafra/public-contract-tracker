import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

// Registra um COMISSIONAMENTO ou CONDICIONAMENTO (Enterprise IT Group).
// Acesso: Diretoria + Administrador (gate via requireApi + RLS nas tabelas).
export async function POST(req: Request) {
  const { user, error } = await requireApi("view_comissionamento");
  if (error) return error;
  const b: any = await req.json().catch(() => ({}));
  const tipo = b.tipo === "condicionamento" ? "condicionamento" : "comissionamento";
  const sb = supabaseAdmin();

  if (tipo === "comissionamento") {
    if (!b.perfil || !b.nome_preenchedor || !b.id_bitrix || !b.margem_projeto || !b.tipo_projeto)
      return NextResponse.json({ error: "Preencha equipe, nome, ID Bitrix, margem e tipo de projeto." }, { status: 400 });
    const comissionados = Array.isArray(b.comissionados)
      ? b.comissionados
          .map((c: any) => ({ nome: String(c?.nome || "").trim(), percentual: Number(c?.percentual) || 0, fases: Array.isArray(c?.fases) ? c.fases : [] }))
          .filter((c: any) => c.nome && c.fases.length > 0)
      : [];
    if (!comissionados.length)
      return NextResponse.json({ error: "Adicione ao menos um comissionado com nome e fase." }, { status: 400 });
    const fases_comissionadas = Array.from(new Set(comissionados.flatMap((c: any) => c.fases))).sort();
    const { error: e } = await sb.from("comissionamentos").insert({
      perfil: b.perfil, nome_preenchedor: String(b.nome_preenchedor).trim(), id_bitrix: String(b.id_bitrix).trim(),
      comissionados, margem_projeto: b.margem_projeto, tipo_projeto: b.tipo_projeto, fases_comissionadas, criado_por: user!.id,
    });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  } else {
    if (!b.perfil || !b.nome_preenchedor || !b.id_bitrix || !b.nome_comissionado)
      return NextResponse.json({ error: "Preencha equipe, nome, ID Bitrix e o comissionado." }, { status: 400 });
    const fases = Array.isArray(b.fases_comissionadas) ? b.fases_comissionadas : [];
    if (!fases.length) return NextResponse.json({ error: "Selecione ao menos uma fase comissionada." }, { status: 400 });
    const perc = (b.percentual === null || b.percentual === undefined || b.percentual === "") ? null : Number(b.percentual);
    const { error: e } = await sb.from("condicionamentos").insert({
      perfil: b.perfil, nome_preenchedor: String(b.nome_preenchedor).trim(),
      sobrenome_preenchedor: String(b.sobrenome_preenchedor || "").trim(), id_bitrix: String(b.id_bitrix).trim(),
      nome_comissionado: String(b.nome_comissionado).trim(), percentual: perc, fases_comissionadas: fases, criado_por: user!.id,
    });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  }

  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: `registrar_${tipo}`, detalhes: `bitrix ${b.id_bitrix || "-"}` });
  return NextResponse.json({ ok: true, message: tipo === "comissionamento" ? "Comissionamento registrado." : "Condicionamento registrado." });
}
