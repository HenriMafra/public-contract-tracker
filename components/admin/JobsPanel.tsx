"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card, CardPad, StatCard, Table, Empty } from "@/components/ui/primitives";
import { ExportButtons } from "@/components/ui/ExportButtons";
import { useJobsListRealtime } from "@/lib/realtime/subscriptions";
import { RealtimeBadge } from "@/components/realtime/RealtimeBadge";

const TONE: Record<string, any> = { success: "green", failed: "red", timeout: "red", cancelled: "amber", running: "navy", queued: "slate", retrying: "amber" };
const JOB_COLS = [
  { key: "id", label: "#" }, { key: "job_type", label: "Tipo" }, { key: "status", label: "Status" },
  { key: "progress_percent", label: "Progresso" }, { key: "current_step", label: "Etapa" },
  { key: "requested_by_email", label: "Executor" }, { key: "duration_seconds", label: "Duração(s)" }, { key: "created_at", label: "Criado" },
];

export function JobsPanel({ canCancel }: { canCancel: boolean }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [dash, setDash] = useState<any>({});
  const refetch = useCallback(() => {
    fetch("/api/jobs/status").then((r) => r.json()).then((j) => { if (j.ok) { setJobs(j.jobs || []); setDash(j.dashboard || {}); } }).catch(() => {});
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  const { status, lastEvent } = useJobsListRealtime(refetch, true);

  async function cancel(id: number) {
    await fetch("/api/jobs/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: id }) });
    refetch();
  }
  const dur = dash.duracao_media != null ? `${Math.round(dash.duracao_media)}s` : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Em execução" value={dash.em_execucao ?? 0} accent="text-fg" />
        <StatCard label="Sucesso" value={dash.sucesso ?? 0} accent="text-green-700" />
        <StatCard label="Falhas" value={dash.falhas ?? 0} accent="text-red-600" />
        <StatCard label="Jobs hoje" value={dash.jobs_hoje ?? 0} />
        <StatCard label="Duração média" value={dur} />
        <StatCard label="Última produção" value={(dash.ultima_producao || "—").toString().slice(5, 16) || "—"} sub="data/hora" />
      </div>

      <Card><CardPad>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="font-bold text-fg">Jobs recentes</div>
          <div className="flex items-center gap-3">
            <ExportButtons rows={jobs} columns={JOB_COLS} filename="atlas_jobs" />
            <RealtimeBadge status={status} lastEvent={lastEvent} />
          </div>
        </div>
        {jobs.length === 0 ? <Empty>Nenhum job ainda. Crie um na página <b>Operação</b>.</Empty> :
          <Table head={["#", "Tipo", "Status", "Progresso", "Etapa", "Executor", "Duração", ""]}>
            {jobs.map((j) => (
              <tr key={j.id} onClick={() => router.push(`/admin/jobs/${j.id}`)} className="border-b border-line last:border-0 hover:bg-surface2 cursor-pointer transition">
                <td className="px-3 py-2 font-mono">{j.id}</td>
                <td className="px-3 py-2">{j.job_type}</td>
                <td className="px-3 py-2"><Badge tone={TONE[j.status] || "slate"}>{j.status}</Badge></td>
                <td className="px-3 py-2">{j.progress_percent ?? 0}%</td>
                <td className="px-3 py-2 text-muted">{j.current_step || "—"}</td>
                <td className="px-3 py-2 text-muted">{(j.requested_by_email || "—").split("@")[0]}</td>
                <td className="px-3 py-2 text-muted">{j.duration_seconds != null ? `${j.duration_seconds}s` : "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/admin/jobs/${j.id}`} className="text-brand font-semibold hover:underline">detalhes</Link>
                  {canCancel && !["success", "failed", "cancelled", "timeout"].includes(j.status) &&
                    <button onClick={() => cancel(j.id)} className="ml-3 text-red-600 hover:underline">cancelar</button>}
                </td>
              </tr>
            ))}
          </Table>}
      </CardPad></Card>
    </div>
  );
}
