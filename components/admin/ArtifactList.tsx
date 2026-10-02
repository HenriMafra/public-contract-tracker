"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/primitives";

const ST_TONE: Record<string, any> = { uploaded: "green", local_only: "amber", failed: "red", missing: "red", skipped: "slate" };
const ST_LABEL: Record<string, string> = { uploaded: "Uploaded", local_only: "Local only", failed: "Failed", missing: "Missing", skipped: "Skipped" };

export function ArtifactList({ artifacts, canReupload }: { artifacts: any[]; canReupload: boolean }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function download(a: any) {
    setBusy(a.id); setMsg("");
    try {
      const r = await fetch(`/api/jobs/artifacts/download?artifact_id=${a.id}`);
      const j = await r.json();
      if (j.url) window.open(j.url, "_blank");
      else setMsg(j.message || j.error || "Indisponível.");
    } catch (e: any) { setMsg("Erro: " + e?.message); }
    finally { setBusy(null); }
  }
  async function copyLink(a: any) {
    setBusy(a.id); setMsg("");
    try {
      const r = await fetch(`/api/jobs/artifacts/download?artifact_id=${a.id}`);
      const j = await r.json();
      if (j.url) { await navigator.clipboard.writeText(j.url); setMsg("Link assinado copiado (expira em 1h)."); }
      else setMsg(j.message || j.error || "Sem link.");
    } catch (e: any) { setMsg("Erro: " + e?.message); }
    finally { setBusy(null); }
  }
  async function reupload(a: any) {
    setBusy(a.id); setMsg("");
    try {
      const r = await fetch("/api/jobs/artifacts/reupload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artifactId: a.id }) });
      const j = await r.json();
      setMsg(j.message ? `${j.message} (job ${j.jobId})` : (j.error || "falha"));
    } catch (e: any) { setMsg("Erro: " + e?.message); }
    finally { setBusy(null); }
  }

  if (!artifacts?.length) return <div className="text-xs text-muted">nenhum artefato ainda</div>;
  return (
    <div>
      <ul className="text-xs divide-y divide-line">
        {artifacts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-2 flex-wrap">
            <span className="flex items-center gap-2 min-w-0">
              <Badge tone="slate">{a.artifact_type}</Badge>
              <span className="truncate">{a.file_name}</span>
              <Badge tone={ST_TONE[a.upload_status] || "slate"}>{ST_LABEL[a.upload_status] || a.upload_status}</Badge>
              {a.size_bytes ? <span className="text-muted">{Math.max(1, Math.round(a.size_bytes / 1024))}kb</span> : null}
              {a.storage_bucket ? <span className="text-muted">· {a.storage_bucket}</span> : null}
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <button disabled={busy === a.id} onClick={() => download(a)} className="text-brand font-semibold hover:underline disabled:opacity-50">baixar</button>
              <button disabled={busy === a.id} onClick={() => copyLink(a)} className="text-muted hover:underline disabled:opacity-50">copiar link</button>
              {canReupload && a.upload_status !== "uploaded" &&
                <button disabled={busy === a.id} onClick={() => reupload(a)} className="text-amber-600 hover:underline disabled:opacity-50">reenviar</button>}
            </span>
          </li>
        ))}
      </ul>
      {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
    </div>
  );
}
