"use client";
import { useEffect, useState } from "react";
import { Card, CardPad } from "@/components/ui/primitives";
import { ArtifactList } from "./ArtifactList";

export function LatestArtifacts({ canReupload = false, title = "Artefatos para download" }: { canReupload?: boolean; title?: string }) {
  const [arts, setArts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/jobs/artifacts/list?limit=40").then((r) => r.json()).then((j) => {
      if (alive) { setArts(j.artifacts || []); setLoaded(true); }
    }).catch(() => setLoaded(true));
    return () => { alive = false; };
  }, []);
  return (
    <Card><CardPad>
      <div className="font-bold text-fg mb-2">{title}</div>
      {!loaded ? <div className="text-xs text-muted">carregando…</div> :
        <ArtifactList artifacts={arts} canReupload={canReupload} />}
      <p className="text-xs text-muted mt-2">Downloads via link assinado (expira em 1h) e limitados ao seu perfil. Auditados.</p>
    </CardPad></Card>
  );
}
