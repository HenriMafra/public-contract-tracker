"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";

// Tela do 2º fator no login: o usuário com MFA ativado digita o código de 6 dígitos.
export function MfaChallenge() {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    sb.auth.mfa.listFactors().then(({ data }) => {
      const totp = (data?.totp || []).find((f: any) => f.status === "verified");
      if (totp) setFactorId(totp.id);
      else setMsg("Nenhum 2º fator encontrado. Saia e entre de novo.");
    }).catch(() => setMsg("Falha ao carregar. Saia e entre de novo."));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  async function verificar(e?: any) {
    e?.preventDefault?.();
    if (!factorId || code.length < 6) return;
    setBusy(true); setMsg("");
    try {
      const ch = await sb.auth.mfa.challenge({ factorId });
      if (ch.error) throw ch.error;
      const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
      if (v.error) { setMsg("Código inválido. Tente de novo."); setBusy(false); return; }
      router.push("/dashboard"); router.refresh();
    } catch (err: any) { setMsg(err?.message || "Erro."); setBusy(false); }
  }
  async function sair() { try { await sb.auth.signOut(); } catch {} router.push("/login"); }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <form onSubmit={verificar} className="w-full max-w-sm bg-surface border border-line rounded-2xl shadow-soft p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-fg"><ShieldCheck size={18} className="text-brand" /> Verificação em 2 fatores</div>
        <p className="text-sm text-muted">Digite o código de 6 dígitos do seu app autenticador.</p>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoFocus
          className="w-full h-12 px-3 rounded-lg border border-line bg-surface text-fg text-center text-2xl tracking-[0.4em] font-mono" />
        <button type="submit" disabled={busy || code.length < 6} className="w-full h-11 rounded-lg bg-brand text-white font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">{busy && <Loader2 size={16} className="animate-spin" />} Verificar</button>
        {msg && <p className="text-xs text-center text-red-600 dark:text-red-400">{msg}</p>}
        <button type="button" onClick={sair} className="w-full text-xs text-muted hover:text-fg">sair e entrar de novo</button>
      </form>
    </div>
  );
}
