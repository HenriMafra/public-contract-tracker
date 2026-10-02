// Tipos e helpers de eventos Realtime.
export type RtSource = "realtime" | "poll";
export type RtEvent = "INSERT" | "UPDATE" | "DELETE";
export type RtChange = { source: RtSource; event?: RtEvent; table?: string; payload?: any };
export type RtStatus = "connecting" | "connected" | "reconnecting" | "offline" | "error";

export type ToastTone = "info" | "success" | "warning" | "error";
export type ToastMsg = { title: string; detail?: string; tone: ToastTone };

// Dispara um toast global (consumido por <RealtimeToasts/>). Sem dependências externas.
export function pushToast(t: ToastMsg) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("atlas-toast", { detail: t }));
}

// Classifica uma mudança em uma notificação (respeito a perfil é feito no componente).
export function classifyJob(row: any): ToastMsg | null {
  if (!row) return null;
  if (row.status === "success") return { title: `Job #${row.id} concluído`, detail: row.job_type, tone: "success" };
  if (row.status === "failed" || row.status === "timeout") return { title: `Job #${row.id} falhou`, detail: row.error_message?.slice(0, 80), tone: "error" };
  if (row.status === "running") return { title: `Job #${row.id} em execução`, detail: row.current_step, tone: "info" };
  if (row.status === "cancelled") return { title: `Job #${row.id} cancelado`, tone: "warning" };
  return null;
}
