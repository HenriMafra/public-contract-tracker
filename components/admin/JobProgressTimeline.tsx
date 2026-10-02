"use client";

const STEPS = [
  "Preparando ambiente", "Lendo configuração", "Rodando doctor", "Coletando PNCP",
  "Classificando contratos", "Calculando score", "Gerando lista de ataque", "Gerando Excel",
  "Gerando relatório", "Atualizando protótipo", "Gravando no banco", "Subindo artefatos",
  "Validando views", "Finalizando",
];

export function JobProgressTimeline({ percent, currentStep, status }: { percent: number; currentStep?: string; status?: string }) {
  const idx = STEPS.findIndex((s) => s === currentStep);
  const done = (i: number) => (status === "success" ? true : idx >= 0 ? i < idx : false);
  const cur = (i: number) => idx === i && !["success", "failed", "cancelled", "timeout"].includes(status || "");
  const barColor = status === "failed" || status === "timeout" ? "bg-red-500" : status === "cancelled" ? "bg-amber-500" : "bg-brand";
  return (
    <div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
        <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, percent || 0))}%` }} />
      </div>
      <div className="text-xs text-muted mb-3">{percent || 0}% — {currentStep || "—"}</div>
      <ol className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={"flex items-center gap-1.5 " + (cur(i) ? "font-bold text-fg" : done(i) ? "text-green-700" : "text-muted")}>
            <span>{done(i) ? "✓" : cur(i) ? "▶" : "•"}</span><span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
