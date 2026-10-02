"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, UserPlus, UserCheck, Search, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils/format";

const COMERCIAL = ["Novo", "Em prospecção", "Em negociação", "Fechado", "Perdido", "Descartado"];

/** Barra de ações no topo do contrato: abrir no PNCP, assumir e decidir
 *  (análise / validar / descartar) sem precisar procurar. Tudo vai pro log. */
export function OpportunityActionBar({
  oppId, linkFonte, statusValidacao, statusComercial, responsavel, meuNome, canAct,
}: {
  oppId: number; linkFonte?: string | null; statusValidacao?: string; statusComercial?: string;
  responsavel?: string; meuNome: string; canAct: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [val, setVal] = useState(statusValidacao || "Pendente");
  const [com, setCom] = useState(statusComercial || "Novo");
  const [resp, setResp] = useState(responsavel || "");
  const mine = !!resp && resp === meuNome;

  async function act(action: string, value: string | undefined, tag: string) {
    setBusy(tag); setMsg("");
    try {
      const r = await fetch("/api/opportunity-action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oportunidade_id: oppId, action, value }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        if (action === "validacao" && value) setVal(value);
        if (action === "comercial" && value) setCom(value);
        if (action === "claim") { setResp(meuNome); setCom("Em prospecção"); }
        if (action === "unclaim") setResp("");
        setMsg(j.message ? `✓ ${j.message}` : "✓ Feito."); router.refresh();
      } else setMsg(j.error || `Falha (${r.status})`);
    } catch { setMsg("Erro de rede."); } finally { setBusy(""); }
  }

  const pill = "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold border transition disabled:opacity-50";
  const ghost = "border-line bg-surface text-fg hover:bg-surface2";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {linkFonte && (
          <a href={linkFonte} target="_blank" rel="noreferrer" className={cn(pill, ghost)}>
            <ExternalLink size={15} /> Abrir no PNCP
          </a>
        )}

        {canAct && (mine ? (
          <button disabled={!!busy} onClick={() => act("unclaim", undefined, "unclaim")}
            className={cn(pill, "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25")}>
            {busy === "unclaim" ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />} Você assumiu · liberar
          </button>
        ) : (
          <button disabled={!!busy} onClick={() => act("claim", undefined, "claim")}
            className={cn(pill, "border-brand bg-brand text-white hover:opacity-90")}>
            {busy === "claim" ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Assumir contrato
          </button>
        ))}

        {canAct && (
          <div className="inline-flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted mr-1">Decisão:</span>
            <button disabled={!!busy} onClick={() => act("validacao", "Em análise", "an")}
              title="Você está avaliando este contrato. Ele fica marcado e aparece no filtro 'Em análise' da Lista de Ataque."
              className={cn(pill, val === "Em análise" ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400" : ghost)}>
              {busy === "an" ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Em análise
            </button>
            <button disabled={!!busy} onClick={() => act("validacao", "Validada", "vd")}
              title="Confirma que é uma boa oportunidade real. Sai da fila de revisão e passa a contar como 'Validada'."
              className={cn(pill, val === "Validada" ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : ghost)}>
              {busy === "vd" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Validar
            </button>
            <button disabled={!!busy} onClick={() => act("validacao", "Descartada", "ds")}
              title="Não interessa. Sai da Lista de Ataque (vai para 'Descartadas'). É reversível pelo filtro de decisão."
              className={cn(pill, val === "Descartada" ? "border-red-500 bg-red-500/15 text-red-600 dark:text-red-400" : ghost)}>
              {busy === "ds" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Descartar
            </button>
            <button disabled={!!busy} onClick={() => act("validacao", "Monitoramento", "mo")}
              title="Acompanhar sem agir agora (ex.: contrato longe de vencer). Fica em 'Monitoradas'."
              className={cn(pill, val === "Monitoramento" ? "border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400" : ghost)}>
              {busy === "mo" ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Monitorar
            </button>
          </div>
        )}
      </div>

      {msg && <div className="text-xs text-muted">{msg}</div>}
      {canAct && <div className="text-xs text-muted">Passe o mouse em cada decisão para ver o que faz. Tudo fica salvo e filtrável na Lista de Ataque.</div>}
      {!canAct && <div className="text-xs text-muted">Seu perfil pode visualizar, mas não alterar este contrato.</div>}
    </div>
  );
}
