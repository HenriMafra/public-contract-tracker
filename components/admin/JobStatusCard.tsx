"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, CardPad } from "@/components/ui/primitives";
import { JobProgressTimeline } from "./JobProgressTimeline";
import { ArtifactList } from "./ArtifactList";
import { useJobRealtime, useArtifactsRealtime } from "@/lib/realtime/subscriptions";
import { RealtimeBadge } from "@/components/realtime/RealtimeBadge";
import { pushToast } from "@/lib/realtime/events";

const FINISHED = ["success", "failed", "cancelled", "timeout"];
const TONE: Record<string, any> = { success: "green", failed: "red", timeout: "red", cancelled: "amber", running: "navy", queued: "slate", retrying: "amber" };

export function JobStatusCard({ jobId, canReupload = false }: { jobId: string | number; canReupload?: boolean }) {
  const [job, setJob] = useState<any>(null);
  const [arts, setArts] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const prev = useRef<string | null>(null);

  const refetch = useCallback(() => {
    fetch(`/api/jobs/status?job_id=${jobId}`).then((r) => r.json()).then((j) => {
      if (!j.ok) return;
      const before = prev.current; const st = j.job?.status;
      setJob(j.job); setArts(j.artifacts || []);
      if (before && before !== st) {
        if (st === "success") pushToast({ title: `Job #${jobId} concluído`, detail: j.job?.job_type, tone: "success" });
        else if (st === "failed" || st === "timeout") pushToast({ title: `Job #${jobId} falhou`, detail: (j.job?.error_message || "").slice(0, 80), tone: "error" });
      }
      prev.current = st;
    }).catch(() => {});
  }, [jobId]);

  useEffect(() => { refetch(); }, [refetch]);
  const active = !!job && !FINISHED.includes(job.status);
  const jr = useJobRealtime(jobId, refetch, true);
  useArtifactsRealtime(jobId, refetch, true);

  async function cancel() {
    setBusy("cancel");
    const r = await fetch("/api/jobs/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    const j = await r.json(); setMsg(j.message || j.error || ""); setBusy("");
  }
  async function reprocess() {
    setBusy("reprocess");
    const r = await fetch("/api/jobs/create", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobType: job.job_type, mode: job.mode, writeDb: job.write_db, confirm: true }) });
    const j = await r.json(); setBusy("");
    if (j.jobId) window.location.href = `/admin/jobs/${j.jobId}`; else setMsg(j.error || "falha");
  }

  if (!job) return <Card><CardPad><div className="text-muted text-sm">Carregando job…</div></CardPad></Card>;
  return (
    <div className="space-y-4">
      <Card className={job.status === "failed" || job.status === "timeout" ? "ring-2 ring-red-300" : ""}><CardPad>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-bold text-fg">Job #{job.id} · {job.job_type}</div>
          <div className="flex items-center gap-2">
            <RealtimeBadge status={jr.status} lastEvent={jr.lastEvent} />
            <Badge tone={TONE[job.status] || "slate"}>{job.status}</Badge>
          </div>
        </div>
        <div className="text-xs text-muted mt-1">
          por {job.requested_by_email || "—"} ({job.requested_by_role || "—"}) · modo {job.mode || "—"} · tag {job.tag || "—"}
          {job.write_db ? " · grava banco" : ""} · criado {(job.created_at || "").replace("T", " ").slice(0, 19)}
          {job.duration_seconds != null ? ` · ${job.duration_seconds}s` : ""}
        </div>
        <div className="mt-4"><JobProgressTimeline percent={job.progress_percent} currentStep={job.current_step} status={job.status} /></div>
        <div className="flex gap-2 mt-4">
          {active && <Button variant="danger" disabled={!!busy} onClick={cancel}>{busy === "cancel" ? "…" : "✖ Cancelar"}</Button>}
          {FINISHED.includes(job.status) && <Button variant="ghost" disabled={!!busy} onClick={reprocess}>{busy === "reprocess" ? "…" : "♻️ Reprocessar"}</Button>}
        </div>
        {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
      </CardPad></Card>

      {job.status === "failed" || job.status === "timeout" ? (
        <Card><CardPad>
          <div className="font-bold text-red-600">Erro</div>
          <pre className="text-xs bg-red-50 text-red-800 rounded p-2 mt-1 whitespace-pre-wrap">{job.error_message || "(sem mensagem)"}</pre>
          <p className="text-xs text-muted mt-2">Sugestão: veja os logs abaixo; verifique credenciais/rede; use “Reprocessar”.</p>
        </CardPad></Card>
      ) : null}

      <Card><CardPad>
        <div className="font-bold text-fg mb-2">Artefatos ({arts.length})</div>
        <ArtifactList artifacts={arts} canReupload={canReupload} />
      </CardPad></Card>
    </div>
  );
}
