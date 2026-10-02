"use client";
import type { RtStatus } from "@/lib/realtime/events";

const MAP: Record<RtStatus, { t: string; c: string }> = {
  connected: { t: "● Ao vivo", c: "bg-green-100 text-green-700" },
  connecting: { t: "● Conectando…", c: "bg-surface2 text-muted" },
  reconnecting: { t: "⚠ Reconectando (polling)", c: "bg-amber-100 text-amber-700" },
  offline: { t: "○ Atualização automática", c: "bg-surface2 text-muted" },
  error: { t: "⚠ Realtime indisponível (polling)", c: "bg-red-100 text-red-700" },
};

export function RealtimeBadge({ status, lastEvent }: { status: RtStatus; lastEvent?: number | null }) {
  const m = MAP[status] || MAP.connecting;
  const title = lastEvent ? `último evento às ${new Date(lastEvent).toLocaleTimeString("pt-BR")}` : "aguardando eventos";
  return <span title={title} className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap " + m.c}>{m.t}</span>;
}
