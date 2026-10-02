"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useJobLogsRealtime } from "@/lib/realtime/subscriptions";
import { RealtimeBadge } from "@/components/realtime/RealtimeBadge";

type Log = { id: number; level: string; step?: string; message: string; created_at?: string };
const COLOR: Record<string, string> = { error: "text-red-400", warning: "text-amber-300", success: "text-green-400", debug: "text-muted", info: "text-slate-200" };

export function JobLogsViewer({ jobId, active = true }: { jobId: string | number; active?: boolean }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const lastId = useRef(0);
  const box = useRef<HTMLPreElement>(null);

  const tick = useCallback(() => {
    fetch(`/api/jobs/logs?job_id=${jobId}&after=${lastId.current}`).then((r) => r.json()).then((j) => {
      if (j.logs?.length) {
        lastId.current = j.logs[j.logs.length - 1].id;
        setLogs((prev) => [...prev, ...j.logs]);
        setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
      }
    }).catch(() => {});
  }, [jobId]);

  useEffect(() => { tick(); }, [tick]);
  // Realtime (INSERT em atlas_job_logs) com fallback polling — onChange refaz o fetch após lastId.
  const { status, lastEvent } = useJobLogsRealtime(jobId, tick, active);

  return (
    <div>
      <div className="flex justify-end mb-1"><RealtimeBadge status={status} lastEvent={lastEvent} /></div>
      <pre ref={box} className="text-xs bg-slate-900 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap">
        {logs.length === 0 ? <span className="text-muted">aguardando logs…</span> :
          logs.map((l) => (
            <div key={l.id} className={COLOR[l.level] || "text-slate-200"}>
              <span className="text-muted">{(l.created_at || "").slice(11, 19)} </span>
              <span className="uppercase text-xs">[{l.level}]</span> {l.step ? `(${l.step}) ` : ""}{l.message}
            </div>
          ))}
      </pre>
    </div>
  );
}
