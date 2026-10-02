import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { nomeResponsavel } from "@/lib/auth/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { checarEscopoOpps } from "@/lib/auth/escopo";

export const dynamic = "force-dynamic";

// Ações rápidas que o próprio comercial faz no contrato (perm: update_status,
// que o Vendedor possui). Tudo grava na trilha (audit_logs.oportunidade_id).
const VALIDACAO = new Set(["Em análise", "Validada", "Descartada", "Pendente", "Monitoramento"]);
const COMERCIAL = new Set(["Novo", "Em prospecção", "Em negociação", "Fechado", "Perdido", "Descartado"]);

export async function POST(req: Request) {
  const { user, error } = await requireApi("update_status");
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const sb = supabaseAdmin();

  // ── BULK: decisão em massa (vários contratos de uma vez) ──
  if (Array.isArray(b.oportunidade_ids) && b.oportunidade_ids.length) {
    if (action !== "validacao") return NextResponse.json({ error: "Ação em massa só suporta decisão." }, { status: 400 });
    const v = String(b.value || "");
    if (!VALIDACAO.has(v)) return NextResponse.json({ error: "Status de validação inválido." }, { status: 400 });
    const ids = Array.from(new Set(b.oportunidade_ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)));
    if (!ids.length) return NextResponse.json({ error: "Nenhum contrato válido selecionado." }, { status: 400 });
    if (ids.length > 1000) return NextResponse.json({ error: "Selecione no máximo 1000 por vez." }, { status: 400 });
    const esc = await checarEscopoOpps(user!, ids as number[]);
    if (!esc.ok) return NextResponse.json({ error: `Sem permissão: ${esc.fora.length} contrato(s) fora da sua UF.` }, { status: 403 });
    const patchMass: any = { status_validacao: v, decidido_por: nomeResponsavel(user) || user!.email, decidido_em: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (v === "Validada") patchMass.necessita_revisao = false;
    const { error: em } = await sb.from("oportunidades").update(patchMass).in("id", ids);
    if (em) return NextResponse.json({ error: em.message }, { status: 500 });
    // espelha na tabela plana da Lista (pra refletir na hora, sem esperar o refresh)
    try { const fm: any = { status_validacao: v }; if (v === "Validada") fm.necessita_revisao = false; await sb.from("lista_flat").update(fm).in("id", ids); } catch {}
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "update_validacao_massa", detalhes: `decisão em massa → ${v} (${ids.length} contrato(s))` });
    return NextResponse.json({ ok: true, message: `${ids.length} contrato(s) marcados como "${v}".`, count: ids.length });
  }

  const oppId = Number(b.oportunidade_id);
  if (!oppId) return NextResponse.json({ error: "Informe oportunidade_id." }, { status: 400 });
  const escUm = await checarEscopoOpps(user!, [oppId]);
  if (!escUm.ok) return NextResponse.json({ error: "Sem permissão: este contrato está fora da sua UF." }, { status: 403 });
  const patch: any = { updated_at: new Date().toISOString() };
  let acao = "", detalhes = "";

  if (action === "claim") {
    const nome = nomeResponsavel(user);
    patch.responsavel_atribuido = nome;
    if (!b.keepStatus) patch.status_comercial = "Em prospecção";
    acao = "claim_opportunity"; detalhes = `assumiu o contrato (responsável: ${nome})`;
  } else if (action === "unclaim") {
    patch.responsavel_atribuido = null;
    acao = "unclaim_opportunity"; detalhes = "liberou o contrato";
  } else if (action === "validacao") {
    const v = String(b.value || "");
    if (!VALIDACAO.has(v)) return NextResponse.json({ error: "Status de validação inválido." }, { status: 400 });
    patch.status_validacao = v;
    patch.decidido_por = nomeResponsavel(user) || user!.email;
    patch.decidido_em = new Date().toISOString();
    if (v === "Validada") patch.necessita_revisao = false;
    acao = "update_validacao"; detalhes = `validação → ${v}`;
  } else if (action === "comercial") {
    const v = String(b.value || "");
    if (!COMERCIAL.has(v)) return NextResponse.json({ error: "Status comercial inválido." }, { status: 400 });
    patch.status_comercial = v;
    acao = "update_comercial"; detalhes = `andamento → ${v}`;
  } else {
    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  }

  const { error: e } = await sb.from("oportunidades").update(patch).eq("id", oppId);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  // espelha as mudanças visíveis na Lista (tabela plana) para refletir na hora
  try {
    const FL = ["status_validacao", "responsavel_atribuido", "status_comercial", "necessita_revisao"];
    const fp: any = {}; for (const k of FL) if (k in patch) fp[k] = patch[k];
    if (Object.keys(fp).length) await sb.from("lista_flat").update(fp).eq("id", oppId);
  } catch {}
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao, detalhes, oportunidade_id: oppId });
  return NextResponse.json({ ok: true, message: detalhes });
}
