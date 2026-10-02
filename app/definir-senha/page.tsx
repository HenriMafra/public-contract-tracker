"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui/primitives";
import { LogoMark } from "@/components/ui/Logo";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const PW_RULES: { key: string; label: string; test: (p: string) => boolean }[] = [
  { key: "len", label: "12+ caracteres", test: (p) => p.length >= 12 },
  { key: "upper", label: "1 maiúscula", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "1 minúscula", test: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "1 número", test: (p) => /[0-9]/.test(p) },
  { key: "symbol", label: "1 símbolo (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [pronta, setPronta] = useState(false);   // sessão de recuperação detectada (link de 1 clique)
  const [precisaCodigo, setPrecisaCodigo] = useState(false); // fallback: pedir e-mail + código
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [show, setShow] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { if (session) setPronta(true); });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) setPronta(true);
      else setTimeout(() => sb.auth.getSession().then(({ data }) => { if (!data.session) setPrecisaCodigo(true); }), 1500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const rules = PW_RULES.map((r) => ({ ...r, ok: r.test(novaSenha) }));
  const pwOk = rules.every((r) => r.ok);
  const t = show ? "text" : "password";

  async function definir(e: React.FormEvent) {
    e.preventDefault(); setErro(""); setMsg("");
    if (!pwOk) { setErro("A senha não atende a todos os requisitos abaixo."); return; }
    if (novaSenha !== confirma) { setErro("A confirmação não corresponde à senha."); return; }
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      if (!pronta) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) || !/^\d{6,8}$/.test(codigo.trim())) {
          setErro("Informe o e-mail e o código (6–8 dígitos) que o administrador te enviou."); setLoading(false); return;
        }
        const { error: e1 } = await sb.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: "recovery" });
        if (e1) { setErro("Código inválido ou expirado. Peça outro ao administrador."); setLoading(false); return; }
      }
      const { error: e2 } = await sb.auth.updateUser({ password: novaSenha });
      if (e2) { setErro(/weak|short|password/i.test(e2.message || "") ? "Senha recusada pela política do servidor." : "Não foi possível definir a senha."); setLoading(false); return; }
      setMsg("Senha definida com sucesso! Entrando…");
      router.push("/dashboard"); router.refresh();
    } catch { setErro("Falha ao definir a senha."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-navy to-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-navy/5 mb-3"><LogoMark size={40} /></div>
            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight">Bem-vindo(a) ao MAPPER</h1>
            <p className="text-sm text-slate-500 mt-1">Defina sua senha para entrar.</p>
          </div>

          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{erro}</div>}
          {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">{msg}</div>}

          <form onSubmit={definir} className="space-y-4">
            {precisaCodigo && !pronta && (
              <>
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Não reconhecemos o link automaticamente. Digite o e-mail e o código que o administrador te passou.</div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Seu e-mail</label>
                  <Input type="email" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código</label>
                  <Input inputMode="numeric" maxLength={8} value={codigo} onChange={(e: any) => setCodigo(e.target.value.replace(/\D/g, ""))} required />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Crie sua senha</label>
              <div className="relative">
                <Input type={t} autoComplete="new-password" value={novaSenha} onChange={(e: any) => setNovaSenha(e.target.value)} className="pr-10" required />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="mostrar senha">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {novaSenha.length > 0 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                  {rules.map((r) => <span key={r.key} className={"text-xs inline-flex items-center gap-1 " + (r.ok ? "text-green-600" : "text-slate-400")}>{r.ok ? "✓" : "○"} {r.label}</span>)}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmar senha</label>
              <Input type={t} autoComplete="new-password" value={confirma} onChange={(e: any) => setConfirma(e.target.value)} required />
              {confirma.length > 0 && confirma !== novaSenha && <p className="text-xs text-red-600 mt-1">As senhas não coincidem.</p>}
            </div>
            <Button type="submit" className="w-full justify-center" disabled={loading || !pwOk || novaSenha !== confirma}>{loading ? "Definindo…" : "Definir senha e entrar"}</Button>
          </form>
          {!pronta && !precisaCodigo && <p className="text-xs text-slate-400 mt-3 text-center">Validando seu convite…</p>}
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-white/70 mt-4"><ShieldCheck size={12} /> MAPPER · acesso restrito</p>
      </div>
    </div>
  );
}
