"use client";
import { isRealtimeConfigured } from "@/lib/realtime/useRealtimeStatus";
import { RealtimeBadge } from "./RealtimeBadge";

// Indicador global no header (reflete config; o status por tela vem das subscriptions).
export function HeaderRealtime() {
  return <RealtimeBadge status={isRealtimeConfigured() ? "connected" : "offline"} />;
}
