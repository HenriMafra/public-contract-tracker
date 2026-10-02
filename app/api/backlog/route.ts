import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

const ok = (e: any = {}) => NextResponse.json({ ok: true, ...e });
const err = (m: string, c = 400) => NextResponse.json({ error: m }, { status: c });
const COLUNAS = ["a_fazer", "fazendo", "revisao", "feito"];
const PRIOS = ["baixa", "media", "alta"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const { user, error } = await requireApi("backlog_view");
  if (error) return error;
  const sb = supabaseAdmin();
  const quem = user!.nome || user!.email || "—";
  const podeAtribuir = can(user!.role, "backlog_assign");
  // Anti-IDOR: editar/arquivar só quem é dono, responsável, ou tem backlog_assign (coordenação).
  // Mover de coluna e comentar ficam abertos (kanban colaborativo).
  async function podeMexer(id: any): Promise<boolean> {
    if (podeAtribuir) return true;
    const { data } = await sb.from("backlog_cards").select("criado_por_id,responsaveis").eq("id", id).limit(1);
    const c: any = data?.[0];
    if (!c) return false;
    if (c.criado_por_id && c.criado_por_id === user!.id) return true;
    const resp = Array.isArray(c.responsaveis) ? c.responsaveis : [];
    return resp.some((r: any) => r && r.id === user!.id);
  }

  if (action === "create") {
    const titulo = String(b.titulo || "").trim();
    if (!titulo) return err("Dê um título à tarefa.");
    let responsaveis = Array.isArray(b.responsaveis) ? b.responsaveis.filter((r: any) => r && r.id) : [];
    const temOutros = responsaveis.some((r: any) => r.id !== user!.id);
    if (temOutros && !podeAtribuir) return err("Você não pode atribuir tarefas a outras pessoas.");
    if (!responsaveis.length) responsaveis = [{ id: user!.id, nome: quem }];
    const coluna = COLUNAS.includes(String(b.coluna)) ? String(b.coluna) : "a_fazer";
    const { data, error: e } = await sb.from("backlog_cards").insert({
      titulo, descricao: String(b.descricao || "").trim() || null, coluna,
      prioridade: PRIOS.includes(String(b.prioridade)) ? String(b.prioridade) : null,
      etiquetas: Array.isArray(b.etiquetas) ? b.etiquetas : [],
      checklist: Array.isArray(b.checklist) ? b.checklist : [],
      responsaveis, prazo: b.prazo || null,
      origem: ["ro", "contrato", "sugestao"].includes(String(b.origem)) ? String(b.origem) : "manual", ro_processo_id: b.ro_processo_id || null, oportunidade_id: b.oportunidade_id || null,
      ordem: Date.now(), criado_por: quem, criado_por_id: user!.id || null,
    }).select("id").limit(1);
    if (e) return err(e.message, 500);
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "backlog_create", detalhes: `${titulo}${temOutros ? " (atribuída a outros)" : ""}` });
    return ok({ id: data?.[0]?.id });
  }

  if (action === "move") {
    if (!b.id || !COLUNAS.includes(String(b.coluna))) return err("id e coluna válidos obrigatórios.");
    const { error: e } = await sb.from("backlog_cards").update({ coluna: String(b.coluna), ordem: typeof b.ordem === "number" ? b.ordem : Date.now(), updated_at: new Date().toISOString() }).eq("id", b.id);
    if (e) return err(e.message, 500); return ok();
  }

  if (action === "update") {
    if (!b.id) return err("id obrigatório.");
    if (!(await podeMexer(b.id))) return err("Você só pode editar tarefas suas ou em que é responsável.", 403);
    const patch: any = { updated_at: new Date().toISOString() };
    if (b.titulo !== undefined) { if (!String(b.titulo).trim()) return err("Título não pode ficar vazio."); patch.titulo = String(b.titulo).trim(); }
    if (b.descricao !== undefined) patch.descricao = String(b.descricao).trim() || null;
    if (b.prioridade !== undefined) patch.prioridade = PRIOS.includes(String(b.prioridade)) ? String(b.prioridade) : null;
    if (b.etiquetas !== undefined) patch.etiquetas = Array.isArray(b.etiquetas) ? b.etiquetas : [];
    if (b.checklist !== undefined) patch.checklist = Array.isArray(b.checklist) ? b.checklist : [];
    if (b.prazo !== undefined) patch.prazo = b.prazo || null;
    const { error: e } = await sb.from("backlog_cards").update(patch).eq("id", b.id);
    if (e) return err(e.message, 500); return ok();
  }

  if (action === "assign") {
    if (!podeAtribuir) return err("Você não pode mudar os responsáveis.");
    if (!b.id) return err("id obrigatório.");
    const { error: e } = await sb.from("backlog_cards").update({ responsaveis: Array.isArray(b.responsaveis) ? b.responsaveis.filter((r: any) => r && r.id) : [], updated_at: new Date().toISOString() }).eq("id", b.id);
    if (e) return err(e.message, 500); return ok();
  }

  if (action === "comentar") {
    if (!b.card_id || !String(b.texto || "").trim()) return err("Comentário vazio.");
    const { error: e } = await sb.from("backlog_comentarios").insert({ card_id: b.card_id, autor: quem, texto: String(b.texto).trim() });
    if (e) return err(e.message, 500); return ok();
  }

  if (action === "arquivar") {
    if (!b.id) return err("id obrigatório.");
    if (!(await podeMexer(b.id))) return err("Você só pode arquivar tarefas suas ou em que é responsável.", 403);
    const { error: e } = await sb.from("backlog_cards").update({ arquivado: b.arquivado !== false, updated_at: new Date().toISOString() }).eq("id", b.id);
    if (e) return err(e.message, 500); return ok();
  }

  return err("Ação desconhecida.");
}
