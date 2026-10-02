"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card, CardPad } from "@/components/ui/primitives";
import { ShieldCheck, Loader2 } from "lucide-react";

// Verificação em 2 fatores (TOTP) — ativação opt-in pelo próprio usuário.
export function MfaCard() {
  const sb = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<any>(null);
  const [enroll, setEnroll] = useState<any>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await sb.auth.mfa.listFactors();
      const totp = (data?.totp || []).find((f: any) => f.status === "verified");
      setFactor(totp || null);
    } catch { /* ignore */ }
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function iniciar() {
    setBusy(true); setMsg("");
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", issuer: "MAPPER" });
    if (error || !data) { setMsg(error?.message || "Falha ao iniciar."); setBusy(false); return; }
    setEnroll({ id: data.id, qr: (data as any).totp.qr_code, secret: (data as any).totp.secret });
    setBusy(false);
  }
  async function confirmar() {
    if (!enroll || code.length < 6) return;
    setBusy(true); setMsg("");
    try {
      const ch = await sb.auth.mfa.challenge({ factorId: enroll.id });
      if (ch.error) throw ch.error;
      const v = await sb.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.data.id, code });
      if (v.error) { setMsg("Código inválido. Confira o relógio do celular e tente de novo."); setBusy(false); return; }
      setEnroll(null); setCode(""); setMsg("✅ 2 fatores ativado!"); setBusy(false); refresh();
    } catch (e: any) { setMsg(e?.message || "Erro."); setBusy(false); }
  }
  async function remover() {
    if (!factor) return;
    if (!confirm("Desativar o 2º fator? Sua conta fica menos protegida.")) return;
    setBusy(true);
    try { await sb.auth.mfa.unenroll({ factorId: factor.id }); } catch { /* ignore */ }
    setBusy(false); refresh();
  }

  return (
    <Card><CardPad>
      <div className="font-bold text-fg mb-1 flex items-center gap-1.5"><ShieldCheck size={16} className="text-brand" /> Verificação em 2 fatores (MFA)</div>
      <p className="text-xs text-muted mb-3">Além da senha, pede um código de 6 dígitos de um app autenticador (Google Authenticator, Microsoft Authenticator). Deixa sua conta muito mais segura.</p>
      {loading ? <div className="text-sm text-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> verificando…</div> :
        factor ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">✅ Ativo nesta conta</span>
            <button onClick={remover} disabled={busy} className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">desativar</button>
          </div>
        ) : enroll ? (
          <div className="space-y-2.5">
            <p className="text-sm text-fg"><b>1)</b> No app autenticador, escaneie o QR (ou digite o código manual):</p>
            <div className="bg-white p-2 rounded-lg inline-block" dangerouslySetInnerHTML={{ __html: enroll.qr }} />
            <p className="text-xs text-muted break-all">código manual: <b className="font-mono">{enroll.secret}</b></p>
            <p className="text-sm text-fg"><b>2)</b> Digite o código de 6 dígitos que aparece no app:</p>
            <div className="flex items-center gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric"
                className="w-28 h-9 px-3 rounded-lg border border-line bg-surface text-fg text-center tracking-widest font-mono" />
              <button onClick={confirmar} disabled={busy || code.length < 6} className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">{busy ? "…" : "Confirmar"}</button>
            </div>
          </div>
        ) : (
          <button onClick={iniciar} disabled={busy} className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">{busy ? "…" : "Ativar 2 fatores"}</button>
        )}
      {msg && <p className="text-xs mt-2 text-muted">{msg}</p>}
    </CardPad></Card>
  );
}
