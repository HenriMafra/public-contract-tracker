"use client";
import { useEffect, useState } from "react";

/** Realtime só é tentado se as chaves públicas forem reais (não placeholder). */
export function isRealtimeConfigured(): boolean {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const a = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return /^https:\/\//.test(u) && !/placeholder/i.test(u) && !!a && !/placeholder/i.test(a);
}

/** Consulta /api/realtime/health periodicamente (status do servidor + publication). */
export function useRealtimeHealth(intervalMs = 60000) {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => fetch("/api/realtime/health").then((r) => r.json()).then((j) => { if (alive) setHealth(j); }).catch(() => {});
    tick();
    const t = setInterval(tick, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [intervalMs]);
  return health;
}
