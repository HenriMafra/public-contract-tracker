"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isRealtimeConfigured } from "./useRealtimeStatus";
import { ch, RT_TABLES, POLL } from "./channels";
import type { RtChange, RtStatus } from "./events";

export type SubOpts = {
  channel: string;
  table: string;
  filter?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  enabled?: boolean;
  onChange?: (c: RtChange) => void;
  pollMs?: number;
};

/**
 * Assina mudanças de uma tabela via Supabase Realtime. Se Realtime não estiver
 * configurado ou cair, faz FALLBACK para polling (pollMs). Limpa tudo no unmount.
 * Segurança: o onChange normalmente faz REFETCH por API protegida (RLS/RBAC),
 * então mesmo o payload do realtime não expõe dado indevido.
 */
export function useRealtimeSubscription(opts: SubOpts): { status: RtStatus; lastEvent: number | null } {
  const { channel, table, filter, event = "*", enabled = true, onChange, pollMs = POLL.idle } = opts;
  const [status, setStatus] = useState<RtStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<number | null>(null);
  const cb = useRef(onChange); cb.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    let removed = false; let pollTimer: any = null; let chan: any = null;
    const sb = supabaseBrowser();
    const fire = (c: RtChange) => { setLastEvent(Date.now()); cb.current?.(c); };
    const startPoll = (ms: number) => { if (pollTimer) return; pollTimer = setInterval(() => fire({ source: "poll", table }), ms); };

    if (isRealtimeConfigured()) {
      try {
        chan = sb.channel(channel)
          .on("postgres_changes", { event, schema: "public", table, ...(filter ? { filter } : {}) } as any,
            (payload: any) => fire({ source: "realtime", event: payload?.eventType, table, payload }))
          .subscribe((st: string) => {
            if (removed) return;
            if (st === "SUBSCRIBED") { setStatus("connected"); if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
            else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") { setStatus("reconnecting"); startPoll(pollMs); }
          });
      } catch { setStatus("error"); startPoll(pollMs); }
    } else {
      setStatus("offline"); startPoll(pollMs);
    }
    return () => { removed = true; if (pollTimer) clearInterval(pollTimer); if (chan) { try { sb.removeChannel(chan); } catch { /* */ } } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, table, filter, event, enabled, pollMs]);

  return { status, lastEvent };
}

// ---------- hooks específicos ----------
export const useJobRealtime = (jobId: string | number, onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.job(jobId), table: RT_TABLES.jobs, filter: `id=eq.${jobId}`, enabled: enabled && !!jobId, onChange, pollMs: POLL.jobRunning });

export const useJobsListRealtime = (onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.jobs(), table: RT_TABLES.jobs, enabled, onChange, pollMs: POLL.jobsList });

export const useJobLogsRealtime = (jobId: string | number, onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.logs(jobId), table: RT_TABLES.jobLogs, filter: `job_id=eq.${jobId}`, event: "INSERT", enabled: enabled && !!jobId, onChange, pollMs: POLL.logs });

export const useArtifactsRealtime = (jobId: string | number, onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.artifacts(jobId), table: RT_TABLES.artifacts, filter: `job_id=eq.${jobId}`, enabled: enabled && !!jobId, onChange, pollMs: POLL.jobRunning });

export const useDashboardRealtime = (onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.dashboard(), table: RT_TABLES.oportunidades, enabled, onChange, pollMs: POLL.dashboard });

export const useListaAtaqueRealtime = (onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.oportunidades(), table: RT_TABLES.oportunidades, enabled, onChange, pollMs: POLL.lista });

export const useOportunidadeRealtime = (id: string | number, onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: ch.oportunidade(id), table: RT_TABLES.oportunidades, filter: `id=eq.${id}`, enabled: enabled && !!id, onChange, pollMs: POLL.lista });

export const useRevisoesRealtime = (onChange: () => void, enabled = true) =>
  useRealtimeSubscription({ channel: "atlas:revisoes", table: RT_TABLES.revisoes, enabled, onChange, pollMs: POLL.dashboard });

// `suffix` distingue consumidores (NotificationBell + NotificationToastBridge se inscrevem
// nas mesmas notificações em paralelo) — dois canais com o MESMO nome no Supabase Realtime
// colidem e entram em loop de reconexão (CHANNEL_ERROR contínuo), o que derruba os dois para
// o fallback de polling e cada um passa a reabrir o outro, gerando dezenas de requisições por
// segundo em vez de 1 a cada 10s. Cada consumidor precisa do próprio canal.
export const useNotificationsRealtime = (onChange: (c: import("./events").RtChange) => void, enabled = true, suffix = "") =>
  useRealtimeSubscription({ channel: `atlas:notificacoes${suffix ? ":" + suffix : ""}`, table: "notificacoes", enabled, onChange, pollMs: POLL.lista });
