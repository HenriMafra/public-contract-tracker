"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";

// Portão do 2º fator OBRIGATÓRIO. Quem já tem fator → digita o código (challenge).
// Quem ainda NÃO tem → cadastra na hora (enroll: QR + código). Em ambos, ao confirmar
// a sessão sobe pra aal2 e libera o acesso.
export function MfaGate() {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "challenge" | "enroll">("loading");
  const [factorId, setFactorId] = useState("");
  const [enroll, setEnroll] = useState<any>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { init(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function init() {
    try {
      const { data } = await sb.auth.mfa.listFactors();
      const totp = (data?.totp || []).find((f: any) => f.status === "verified");
      if (totp) { setFactorId(totp.id); setMode("challenge"); return; }
      await iniciarEnroll();
    } catch (e: any) { setMsg(e?.message || "Erro ao carregar."); setMode("enroll"); }
  }

  async function iniciarEnroll() {
    try {
      const { data } = await sb.auth.mfa.listFactors();
      for (const f of ((data?.all || []) as any[])) if (f.status !== "verified") { try { await sb.auth.mfa.unenroll({ factorId: f.id }); } catch {} }
    } catch {}
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", issuer: "MAPPER" });
    if (error || !data) { setMsg(error?.message || "Falha ao iniciar o cadastro."); setMode("enroll"); return; }
    setEnroll({ id: data.id, qr: (data as any).totp.qr_code, secret: (data as any).totp.secret });
    setMode("enroll");
  }

  async function verificar(e?: any) {
    e?.preventDefault?.();
    const fid = mode === "enroll" ? enroll?.id : factorId;
    if (!fid || code.length < 6) return;
    setBusy(true); setMsg("");
    try {
      const ch = await sb.auth.mfa.challenge({ factorId: fid });
      if (ch.error) throw ch.error;
      const v = await sb.auth.mfa.verify({ factorId: fid, challengeId: ch.data.id, code });
      if (v.error) { setMsg("Código inválido. Confira o relógio do celular e tente de novo."); setBusy(false); return; }
      router.push("/dashboard"); router.refresh();
    } catch (err: any) { setMsg(err?.message || "Erro."); setBusy(false); }
  }
  async function sair() { try { await sb.auth.signOut(); } catch {} router.push("/login"); }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <form onSubmit={verificar} className="w-full max-w-sm bg-surface border border-line rounded-2xl shadow-soft p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-fg"><ShieldCheck size={18} className="text-brand" /> Verificação em 2 fatores</div>
        {mode === "loading" ? (
          <div className="text-sm text-muted flex items-center gap-2 py-6 justify-center"><Loader2 size={16} className="animate-spin" /> carregando…</div>
        ) : (<>
          {mode === "enroll" && enroll && (
            <div className="space-y-2">
              <p className="text-sm text-fg">Sua conta exige 2 fatores. <b>Configure uma vez só:</b></p>
              <p className="text-sm text-muted"><b>1)</b> No <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b>, escaneie o QR:</p>
              <div className="bg-white p-2 rounded-lg inline-block" dangerouslySetInnerHTML={{ __html: enroll.qr }} />
              <p className="text-xs text-muted break-all">código manual: <b className="font-mono">{enroll.secret}</b></p>
              <p className="text-sm text-muted"><b>2)</b> Digite o código de 6 dígitos do app:</p>
            </div>
          )}
          {mode === "challenge" && <p className="text-sm text-muted">Digite o código de 6 dígitos do seu app autenticador.</p>}
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoFocus
            className="w-full h-12 px-3 rounded-lg border border-line bg-surface text-fg text-center text-2xl tracking-[0.4em] font-mono" />
          <button type="submit" disabled={busy || code.length < 6} className="w-full h-11 rounded-lg bg-brand text-white font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">{busy && <Loader2 size={16} className="animate-spin" />} {mode === "enroll" ? "Ativar e entrar" : "Verificar"}</button>
          {msg && <p className="text-xs text-center text-red-600 dark:text-red-400">{msg}</p>}
          <button type="button" onClick={sair} className="w-full text-xs text-muted hover:text-fg">sair e entrar de novo</button>
        </>)}
      </form>
    </div>
  );
}
