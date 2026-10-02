"use client";
import { useEffect, useState } from "react";
import { Card, CardPad, Button } from "@/components/ui/primitives";

const FIELDS: { key: string; label: string }[] = [
  { key: "notify_jobs", label: "Jobs (execuções do pipeline)" },
  { key: "notify_opportunities", label: "Oportunidades (novas/críticas)" },
  { key: "notify_assignments", label: "Atribuições e tarefas" },
  { key: "notify_reviews", label: "Revisões pendentes" },
  { key: "notify_artifacts", label: "Artefatos disponíveis" },
  { key: "notify_errors", label: "Erros (pipeline/Storage)" },
  { key: "notify_weekly_summary", label: "Resumo semanal" },
];

export function NotificationPreferences({ role }: { role: string }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const adminOp = role === "Administrador" || role === "Operador de Inteligência";
  useEffect(() => { fetch("/api/notifications/preferences").then((r) => r.json()).then((j) => { if (j.ok) setPrefs(j.prefs || {}); }); }, []);
  async function save() {
    setMsg("");
    const r = await fetch("/api/notifications/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) });
    const j = await r.json(); setMsg(j.ok ? "Preferências salvas." : (j.error || "falha"));
  }
  return (
    <Card><CardPad>
      <div className="font-bold text-fg mb-1">Preferências de notificação</div>
      <p className="text-xs text-muted mb-3">Escolha o que receber. <b>Alertas críticos e erros{adminOp ? " (obrigatórios para o seu perfil)" : ""} sempre aparecem.</b></p>
      <div className="space-y-2">
        {FIELDS.map((f) => {
          const mandatory = f.key === "notify_errors" && adminOp;
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs[f.key] ?? true} disabled={mandatory}
                onChange={(e) => setPrefs({ ...prefs, [f.key]: e.target.checked })} />
              <span className={mandatory ? "text-muted" : ""}>{f.label}{mandatory ? " (obrigatório)" : ""}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save}>Salvar preferências</Button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </CardPad></Card>
  );
}
