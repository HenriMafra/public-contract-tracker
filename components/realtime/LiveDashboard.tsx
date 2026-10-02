"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardRealtime } from "@/lib/realtime/subscriptions";
import { RealtimeBadge } from "./RealtimeBadge";

/** Envolve o conteúdo do dashboard (server-rendered). Em mudança relevante, faz router.refresh()
 *  (throttled) para recalcular os KPIs no servidor com RLS — sem reload da página. */
export function LiveDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const last = useRef(0);
  const onChange = useCallback(() => {
    const now = Date.now();
    if (now - last.current < 3000) return; // throttle anti-tempestade
    last.current = now; setUpdatedAt(now); router.refresh();
  }, [router]);
  const { status, lastEvent } = useDashboardRealtime(onChange, true);
  void updatedAt; void status; void lastEvent; // badge "ao vivo" removido — realtime segue atualizando em silêncio
  return <>{children}</>;
}
