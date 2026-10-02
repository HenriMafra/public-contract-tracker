"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ChevronDown } from "lucide-react";

// Botão de RESET/ROLLBACK do Admin (reutilizável). Desfaz decisões/status de uma oportunidade.
const OPCOES = [
  { tipo: "decisao", label: "Resetar decisão (→ Pendente)", desc: "desfaz validar / descartar / monitorar" },
  { tipo: "status", label: "Resetar status comercial", desc: "volta o andamento para Novo" },
  { tipo: "responsavel", label: "Tirar responsável", desc: "libera o dono do contrato" },
  { tipo: "tudo", label: "Resetar TUDO", desc: "decisão + status + responsável", danger: true },
];

export function AdminReset({ oppId, compact = false }: { oppId: number; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function reset(tipo: string, label: string) {
    if (!confirm(`Admin: ${label}?\nA ação anterior da pessoa será desfeita (fica registrado na auditoria).`)) return;
    setBusy(tipo); setMsg("");
    try {
      const r = await fetch("/api/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oportunidade_id: oppId, tipo }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setOpen(false); router.refresh(); } else setMsg(j.error || "falhou");
    } catch { setMsg("erro de rede"); } finally { setBusy(""); }
  }

  return (
    <div className="relative inline-block text-left">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={"inline-flex items-center gap-1 rounded-lg border border-amber-500/50 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/10 transition " + (compact ? "h-7 px-2 text-xs" : "h-8 px-3 text-xs")}>
        <RotateCcw size={13} /> Resetar (admin) <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-64 bg-surface border border-line rounded-xl shadow-xl p-1" onClick={(e) => e.stopPropagation()}>
            {OPCOES.map((o) => (
              <button key={o.tipo} disabled={!!busy} onClick={() => reset(o.tipo, o.label)}
                className={"w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface2 disabled:opacity-50 " + (o.danger ? "text-red-600 dark:text-red-400" : "text-fg")}>
                <div className="text-sm font-semibold">{busy === o.tipo ? "…" : o.label}</div>
                <div className="text-xs text-muted">{o.desc}</div>
              </button>
            ))}
            {msg && <div className="text-xs text-red-600 dark:text-red-400 px-2.5 py-1">{msg}</div>}
          </div>
        </>
      )}
    </div>
  );
}
