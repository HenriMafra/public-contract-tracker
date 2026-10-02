export type NotifLevel = "info" | "success" | "warning" | "error" | "critical";

export type Notif = {
  id: number;
  tipo: string;
  titulo: string;
  mensagem?: string;
  nivel: NotifLevel;
  perfil_destino?: string | null;
  usuario_destino_email?: string | null;
  responsavel_destino?: string | null;
  escopo?: string;
  job_id?: number | null;
  oportunidade_id?: number | null;
  artifact_id?: number | null;
  link_url?: string | null;
  lida?: boolean;
  lida_em?: string | null;
  created_at?: string;
};

export type NotifPrefs = {
  notify_jobs: boolean; notify_opportunities: boolean; notify_assignments: boolean;
  notify_reviews: boolean; notify_artifacts: boolean; notify_errors: boolean; notify_weekly_summary: boolean;
};

export const LEVEL_TONE: Record<string, string> = {
  info: "bg-slate-100 text-slate-700", success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700", error: "bg-red-100 text-red-700",
  critical: "bg-red-600 text-white",
};

export const TYPE_ICON: Record<string, string> = {
  job_started: "▶️", job_success: "✅", job_failed: "❌", job_cancelled: "⏹️",
  artifact_available: "📦", artifact_failed: "⚠️", opportunity_created: "🆕",
  opportunity_critical: "🔥", opportunity_assigned: "🎯", opportunity_changed: "✏️",
  review_required: "🔎", review_resolved: "✔️", contact_registered: "📞", task_created: "🗂️",
  pipeline_error: "🛑", storage_error: "🗄️", system_alert: "🔔", weekly_summary: "📈",
};
