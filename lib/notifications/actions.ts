import { supabaseAdmin } from "@/lib/supabase/admin";
import { visibilityOr } from "./rules";
import type { AppUser } from "@/lib/auth/guard";

/** Cria 1+ notificações (service role; usado por API routes do app: assign/validate/contact/reupload). */
export async function createNotifications(rows: any[]) {
  if (!rows?.length) return { ids: [], error: null };
  const sb = supabaseAdmin();
  const norm = rows.map((r) => ({ nivel: "info", escopo: "role", criada_por: "app", ...r }));
  const { data, error } = await sb.from("notificacoes").insert(norm).select("id");
  return { ids: (data || []).map((r: any) => r.id), error };
}

/** Marca como lidas SOMENTE as que o usuário pode ver (defesa em código + RLS). */
export async function markRead(user: AppUser, ids: number[]) {
  if (!ids?.length) return { error: null };
  const sb = supabaseAdmin();
  let q: any = sb.from("notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).in("id", ids);
  const vis = visibilityOr(user); if (vis) q = q.or(vis);
  const { error } = await q;
  return { error };
}

export async function markAllRead(user: AppUser) {
  const sb = supabaseAdmin();
  let q: any = sb.from("notificacoes").update({ lida: true, lida_em: new Date().toISOString() }).eq("lida", false);
  const vis = visibilityOr(user); if (vis) q = q.or(vis);
  const { error } = await q;
  return { error };
}

export async function getPrefs(user: AppUser) {
  const sb = supabaseAdmin();
  const uid = (user as any).id;
  const { data } = await sb.from("notification_preferences").select("*").eq("user_id", uid).single();
  return data || null;
}

export async function setPrefs(user: AppUser, prefs: Record<string, boolean>) {
  const sb = supabaseAdmin();
  const uid = (user as any).id;
  const row = { user_id: uid, email: (user as any).email, role: user.role, updated_at: new Date().toISOString(), ...prefs };
  const { error } = await sb.from("notification_preferences").upsert(row, { onConflict: "user_id" });
  return { error };
}
