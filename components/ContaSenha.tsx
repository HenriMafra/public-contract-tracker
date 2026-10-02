"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Input, Card, CardPad } from "@/components/ui/primitives";
import { KeyRound } from "lucide-react";

function forte(s: string) {
  return s.length >= 12 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s) && /[^a-zA-Z0-9]/.test(s);
}

export function ContaSenha() {
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function salvar() {
    setMsg(null);
    if (p1 !== p2) { setMsg({ ok: false, t: "As senhas não coincidem." }); return; }
    if (!forte(p1)) { setMsg({ ok: false, t: "Senha fraca: use 12+ caracteres com maiúscula, minúscula, número e símbolo." }); return; }
    setBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password: p1 });
      if (error) setMsg({ ok: false, t: error.message });
      else { setMsg({ ok: true, t: "Senha alterada com sucesso." }); setP1(""); setP2(""); }
    } catch (e: any) { setMsg({ ok: false, t: "Erro: " + (e?.message || "") }); }
    finally { setBusy(false); }
  }

  return (
    <Card><CardPad>
      <div className="flex items-center gap-2 font-bold text-fg mb-1"><KeyRound size={16} className="text-brand" /> Trocar senha</div>
      <p className="text-xs text-muted mb-3">Mínimo 12 caracteres, com maiúscula, minúscula, número e símbolo.</p>
      <div className="space-y-2 max-w-sm">
        <Input type="password" placeholder="Nova senha" value={p1} onChange={(e: any) => setP1(e.target.value)} />
        <Input type="password" placeholder="Confirmar nova senha" value={p2} onChange={(e: any) => setP2(e.target.value)} />
        <Button disabled={busy || !p1 || !p2} onClick={salvar}>{busy ? "Salvando…" : "Salvar nova senha"}</Button>
      </div>
      {msg && <div className={"text-sm mt-3 px-3 py-2 rounded-lg " + (msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600")}>{msg.t}</div>}
    </CardPad></Card>
  );
}
