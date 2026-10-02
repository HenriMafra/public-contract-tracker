import { supabaseAdmin } from "@/lib/supabase/admin";
import { visibilityOr } from "./rules";
import type { AppUser } from "@/lib/auth/guard";

type ListOpts = { onlyUnread?: boolean; limit?: number; tipo?: string; nivel?: string; lida?: boolean; q?: string };

/** Notificações visíveis ao usuário (service role + filtro de visibilidade em código + RLS no banco). */
export async function listForUser(user: AppUser, o: ListOpts = {}) {
  const sb = supabaseAdmin();
  let query: any = sb.from("notificacoes").select("*").order("created_at", { ascending: false }).limit(o.limit ?? 50);
  const vis = visibilityOr(user); if (vis) query = query.or(vis);
  if (o.onlyUnread) query = query.eq("lida", false);
  if (typeof o.lida === "boolean") query = query.eq("lida", o.lida);
  if (o.tipo) query = query.eq("tipo", o.tipo);
  if (o.nivel) query = query.eq("nivel", o.nivel);
  if (o.q) query = query.ilike("titulo", `%${o.q}%`);
  const { data } = await query;
  return data || [];
}

export async function unreadCount(user: AppUser): Promise<number> {
  const sb = supabaseAdmin();
  let query: any = sb.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false);
  const vis = visibilityOr(user); if (vis) query = query.or(vis);
  const { count } = await query;
  return count || 0;
}

export async function dashboard() {
  const sb = supabaseAdmin();
  const { data } = await sb.from("vw_notification_dashboard").select("*").single();
  return data || {};
}
