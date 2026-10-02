"use client";
import { useNotificationsRealtime } from "@/lib/realtime/subscriptions";
import { pushToast, type RtChange } from "@/lib/realtime/events";

const TONE: Record<string, any> = { info: "info", success: "success", warning: "warning", error: "error", critical: "error" };

/** Toast quando uma NOVA notificação persistida chega via Realtime (respeita RLS na origem).
 *  No modo polling não dispara toast (evita repetir) — o sino atualiza o contador. */
export function NotificationToastBridge() {
  useNotificationsRealtime((c: RtChange) => {
    if (c.source !== "realtime" || c.event !== "INSERT") return;
    const n = c.payload?.new; if (!n) return;
    pushToast({ title: n.titulo || "Nova notificação", detail: n.mensagem, tone: TONE[n.nivel] || "info" });
  }, true, "toast");
  return null;
}
