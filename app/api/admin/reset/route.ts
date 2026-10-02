import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// RESET / ROLLBACK de Admin (perm reset_decisao = só Administrador). Desfaz decisões/status
// de uma ou várias oportunidades. tipo: decisao | status | responsavel | tudo. Tudo auditado.
export async function POST(req: Request) {
  const { user, error } = await requireApi("reset_decisao");
  if (error) {
    if (user) await audit({ usuario: user.nome || user.email, perfil: user.role, acao: "admin_reset", resultado: "NEGADO" });
    return error;
  }
  const b = await req.json().catch(() => ({}));
  const tipo = String(b.tipo || "");
  const idsRaw: any[] = Array.isArray(b.oportunidade_ids) ? b.oportunidade_ids : (b.oportunidade_id ? [b.oportunidade_id] : []);
  const ids: number[] = Array.from(new Set(idsRaw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
  if (!ids.length) return NextResponse.json({ error: "Informe oportunidade_id(s)." }, { status: 400 });
  if (!["decisao", "status", "responsavel", "tudo"].includes(tipo)) return NextResponse.json({ error: "tipo inválido." }, { status: 400 });
  if (ids.length > 2000) return NextResponse.json({ error: "No máximo 2000 por vez." }, { status: 400 });

  const now = new Date().toISOString();
  const patch: any = { updated_at: now };
  if (tipo === "decisao" || tipo === "tudo") { patch.status_validacao = "Pendente"; patch.decidido_por = null; patch.decidido_em = null; }
  if (tipo === "status" || tipo === "tudo") { patch.status_comercial = "Novo"; }
  if (tipo === "responsavel" || tipo === "tudo") { patch.responsavel_atribuido = null; }

  const sb = supabaseAdmin();
  const { error: e } = await sb.from("oportunidades").update(patch).in("id", ids);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  try {
    const fl: any = {};
    for (const k of ["status_validacao", "status_comercial", "responsavel_atribuido"]) if (k in patch) fl[k] = patch[k];
    if (Object.keys(fl).length) await sb.from("lista_flat").update(fl).in("id", ids);
  } catch { /* o espelho na lista_flat é melhor-esforço */ }

  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "admin_reset", detalhes: `reset ${tipo} em ${ids.length} contrato(s)`, resultado: "OK", oportunidade_id: ids.length === 1 ? ids[0] : null });
  return NextResponse.json({ ok: true, message: `Resetado (${tipo}): ${ids.length} contrato(s).` });
}
