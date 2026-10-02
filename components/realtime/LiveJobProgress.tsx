"use client";
import { useCallback, useEffect, useState } from "react";
import { useJobRealtime } from "@/lib/realtime/subscriptions";
import { JobProgressTimeline } from "@/components/admin/JobProgressTimeline";
import { RealtimeBadge } from "./RealtimeBadge";

/** Progresso de um job ao vivo (Realtime + fallback polling). Compacto. */
export function LiveJobProgress({ jobId }: { jobId: string | number }) {
  const [job, setJob] = useState<any>(null);
  const refetch = useCallback(() => {
    fetch(`/api/jobs/status?job_id=${jobId}`).then((r) => r.json()).then((j) => { if (j.ok) setJob(j.job); }).catch(() => {});
  }, [jobId]);
  useEffect(() => { refetch(); }, [refetch]);
  const active = !!job && !["success", "failed", "cancelled", "timeout"].includes(job.status);
  const { status, lastEvent } = useJobRealtime(jobId, refetch, active || !job);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-fg">Job #{jobId}{job?.status ? ` · ${job.status}` : ""}</span>
        <RealtimeBadge status={status} lastEvent={lastEvent} />
      </div>
      <JobProgressTimeline percent={job?.progress_percent || 0} currentStep={job?.current_step} status={job?.status} />
    </div>
  );
}
