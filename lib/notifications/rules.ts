import type { AppUser } from "@/lib/auth/guard";

export const isAdmin = (role?: string) => role === "Administrador";

// tipo -> chave de preferência (espelha src/atlas_notifications.py TYPE_PREF)
export const PREF_FOR_TYPE: Record<string, keyof import("./types").NotifPrefs> = {
  job_started: "notify_jobs", job_success: "notify_jobs", job_failed: "notify_jobs", job_cancelled: "notify_jobs",
  artifact_available: "notify_artifacts", artifact_failed: "notify_artifacts",
  opportunity_created: "notify_opportunities", opportunity_critical: "notify_opportunities", opportunity_changed: "notify_opportunities",
  opportunity_assigned: "notify_assignments", task_created: "notify_assignments", contact_registered: "notify_assignments",
  review_required: "notify_reviews", review_resolved: "notify_reviews",
  pipeline_error: "notify_errors", storage_error: "notify_errors", system_alert: "notify_errors",
  weekly_summary: "notify_weekly_summary",
};

/** Filtro .or() do supabase-js que recorta as notificações visíveis ao usuário (defesa em código,
 *  além da RLS no banco). Admin não recebe filtro (vê tudo). */
export function visibilityOr(user: AppUser): string | null {
  if (isAdmin(user.role)) return null;
  const parts = [`perfil_destino.eq.${user.role}`];
  if ((user as any).id) parts.push(`usuario_destino_id.eq.${(user as any).id}`);
  if ((user as any).email) parts.push(`usuario_destino_email.eq.${(user as any).email}`);
  const vend = (user as any).vendedor_nome;
  if (vend) parts.push(`responsavel_destino.eq.${vend}`);
  return parts.join(",");
}

/** Preferência pode ocultar um tipo? Não, se for crítico (sempre) ou erro p/ Admin/Operador (obrigatório). */
export function isMandatory(tipo: string, nivel: string, role?: string): boolean {
  if (nivel === "critical") return true;
  if (nivel === "error" && (role === "Administrador" || role === "Operador de Inteligência")) return true;
  return false;
}
