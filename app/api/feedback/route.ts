import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

const ok = (extra: any = {}) => NextResponse.json({ ok: true, ...extra });
const err = (msg: string, code = 400) => NextResponse.json({ error: msg }, { status: code });

const TIPOS = ["sugestao", "pergunta", "bug"];
const STATUS = ["aberto", "em_andamento", "resolvido", "fechado"];
const PRIOS = ["baixa", "media", "alta"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  // criar/ver: qualquer logado (feedback_view). Gerenciar (status/resposta/prioridade): só admin (feedback_manage).
  const perm = action === "create" ? "feedback_view" : "feedback_manage";
  const { user, error } = await requireApi(perm);
  if (error) return error;
  const quem = user!.nome || user!.email || "—";
  const sb = supabaseAdmin();

  // ---- Qualquer usuário cria um item ----
  if (action === "create") {
    const tipo = TIPOS.includes(String(b.tipo)) ? String(b.tipo) : "sugestao";
    const titulo = String(b.titulo || "").trim();
    if (!titulo) return err("Dê um título curto ao seu item.");
    const { error: e } = await sb.from("feedback").insert({
      tipo, titulo, descricao: String(b.descricao || "").trim() || null, pagina: String(b.pagina || "").trim() || null,
      autor_nome: quem, autor_email: user!.email || null, autor_id: user!.id || null, status: "aberto",
    });
    if (e) return err(e.message, 500);
    return ok();
  }

  // ---- Admin: mudar status ----
  if (action === "update_status") {
    if (!b.id || !STATUS.includes(String(b.status))) return err("id e status válidos obrigatórios.");
    const { error: e } = await sb.from("feedback").update({ status: String(b.status), updated_at: new Date().toISOString() }).eq("id", b.id);
    if (e) return err(e.message, 500);
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "feedback_status", detalhes: `#${b.id} → ${b.status}` });
    return ok();
  }

  // ---- Admin: responder (e opcionalmente já mudar o status) ----
  if (action === "responder") {
    if (!b.id) return err("id obrigatório.");
    const patch: any = { resposta: String(b.resposta || "").trim() || null, respondido_por: quem, updated_at: new Date().toISOString() };
    if (STATUS.includes(String(b.status))) patch.status = String(b.status);
    const { error: e } = await sb.from("feedback").update(patch).eq("id", b.id);
    if (e) return err(e.message, 500);
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "feedback_responder", detalhes: `#${b.id}` });
    return ok();
  }

  // ---- Admin: prioridade ----
  if (action === "set_prioridade") {
    if (!b.id) return err("id obrigatório.");
    const prioridade = PRIOS.includes(String(b.prioridade)) ? String(b.prioridade) : null;
    const { error: e } = await sb.from("feedback").update({ prioridade, updated_at: new Date().toISOString() }).eq("id", b.id);
    if (e) return err(e.message, 500);
    return ok();
  }

  return err("Ação desconhecida.");
}
