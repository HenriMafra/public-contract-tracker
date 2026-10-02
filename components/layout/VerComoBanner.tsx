"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";

export function VerComoBanner() {
  const router = useRouter();
  const [vc, setVc] = useState<{ nome: string; role: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    fetch("/api/ver-como").then((r) => r.json()).then((j) => { if (on && j?.ativo) setVc({ nome: j.nome, role: j.role }); }).catch(() => {});
    return () => { on = false; };
  }, []);

  if (!vc) return null;
  async function sair() {
    setBusy(true);
    try {
      await fetch("/api/ver-como", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clear: true }) });
      setVc(null);
      router.refresh();
    } finally { setBusy(false); }
  }
  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 sm:px-6 py-2 flex items-center gap-2 text-sm">
      <Eye size={15} className="shrink-0" />
      <span className="min-w-0">Pré-visualizando como <b>{vc.nome || "usuário"}</b> ({vc.role}) — você vê exatamente o que essa pessoa vê.</span>
      <button onClick={sair} disabled={busy} className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline whitespace-nowrap">
        <X size={14} /> {busy ? "saindo…" : "voltar à minha visão"}
      </button>
    </div>
  );
}
