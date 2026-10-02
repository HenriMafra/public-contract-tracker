"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";

// Botão "marcar concorrente conhecido" (Admin). Migrado do módulo Radar (RadarMarkCompetitor)
// para a tela de Fornecedores. Chama por CNPJ (a lista é indexada por CNPJ, não por id).
export function MarcarConcorrente({ cnpj, nome }: { cnpj: string; nome?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function mark() {
    if (!confirm(`Marcar "${nome || "este fornecedor"}" como CONCORRENTE CONHECIDO (ameaça alta)?`)) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/fornecedor/mark-competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj, conhecido: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setMsg("✓ marcado"); router.refresh(); }
      else setMsg(j.error || "falhou");
    } catch {
      setMsg("erro de rede");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); mark(); }}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-red-500/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-500/10 transition disabled:opacity-50 shrink-0">
      <Swords size={13} /> {busy ? "…" : msg || "Marcar concorrente"}
    </button>
  );
}
