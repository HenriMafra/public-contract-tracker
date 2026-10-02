"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useListaAtaqueRealtime } from "@/lib/realtime/subscriptions";
import { RealtimeBadge } from "./RealtimeBadge";

/** Envolve a Lista de Ataque (server-rendered, já filtrada por RLS/filtros). Em alteração de
 *  oportunidades, faz router.refresh() (throttled) — a lista re-renderiza com os filtros atuais. */
export function LiveListaAtaque({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const last = useRef(0);
  const onChange = useCallback(() => {
    const now = Date.now();
    if (now - last.current < 4000) return;
    last.current = now; setUpdatedAt(now); router.refresh();
  }, [router]);
  const { status, lastEvent } = useListaAtaqueRealtime(onChange, true);
  void updatedAt; void status; void lastEvent; // badge "ao vivo" removido — realtime segue atualizando em silêncio
  return <>{children}</>;
}
