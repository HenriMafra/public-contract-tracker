"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

// ---- validações (cliente) ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COMMON_DOMAINS = [
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.com.br", "icloud.com", "me.com", "proton.me", "protonmail.com",
  "uol.com.br", "bol.com.br", "terra.com.br", "globo.com", "globomail.com",
];
const COMMON_TLDS = ["com", "com.br", "net", "org", "net.br", "org.br", "edu.br", "gov.br"];
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}
function closest(value: string, list: string[], maxDist: number): string | null {
  let best: string | null = null, bd = 99;
  for (const c of list) { const d = lev(value, c); if (d < bd) { bd = d; best = c; } }
  return best && bd > 0 && bd <= maxDist ? best : null;
}
function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;
  const dom = closest(domain, COMMON_DOMAINS, 2);
  if (dom) return `${user}@${dom}`;
  const dot = domain.lastIndexOf(".");
  if (dot > 0) {
    const base = domain.slice(0, dot), tld = domain.slice(dot + 1);
    const t = closest(tld, COMMON_TLDS, 1);
    if (t) return `${user}@${base}.${t}`;
  }
  return null;
}
const PW_RULES: { key: string; label: string; test: (p: string) => boolean }[] = [
  { key: "len", label: "12+ caracteres", test: (p) => p.length >= 12 },
  { key: "upper", label: "1 maiúscula", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "1 minúscula", test: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "1 número", test: (p) => /[0-9]/.test(p) },
  { key: "symbol", label: "1 símbolo (!@#$…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const POS_LOGIN = "/dashboard";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "esqueci" | "codigo">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Sessão já ativa (ex.: link de recuperação de 1 clique) → entra direto.
  // Guardado por viewRef: NÃO redireciona durante o fluxo de código (verifyOtp cria sessão).
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => {
    const sb = supabaseBrowser();
    let done = false;
    const go = () => { if (!done && viewRef.current === "login") { done = true; router.replace(POS_LOGIN); router.refresh(); } };
    sb.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { if (session) go(); });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Login sempre no tema "Padrão · Foco" (indigo); restaura o tema do usuário ao sair da tela.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute("data-theme");
    el.setAttribute("data-theme", "indigo");
    return () => { if (prev) el.setAttribute("data-theme", prev); else el.removeAttribute("data-theme"); };
  }, []);

  const sug = email.includes("@") ? suggestEmail(email) : null;
  const ruleState = PW_RULES.map((r) => ({ ...r, ok: r.test(novaSenha) }));
  const pwOk = ruleState.every((r) => r.ok);
  const pwType = showPw ? "text" : "password";

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { setErro("Informe um e-mail válido."); return; }
    setErro(""); setMsg(""); setLoading(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) setErro("E-mail ou senha inválidos.");
      else { router.push(POS_LOGIN); router.refresh(); }
    } catch { setErro("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setLoading(false); }
  }

  // Vai para a tela de recuperação. Se o e-mail já estiver preenchido, já solicita o código.
  function irParaEsqueci() {
    setErro(""); setMsg("");
    setView("esqueci");
    if (EMAIL_RE.test(email)) solicitarReset();
  }

  // Solicita o código: o servidor confere se o e-mail existe (sem enumeração pública).
  // Existe → envia o código (expira em 5 min) e vai à tela de código.
  // Não existe → avisa que não está cadastrado e orienta procurar o administrador.
  async function solicitarReset() {
    if (!EMAIL_RE.test(email)) { setErro("Informe um e-mail válido (ex.: nome@dominio.com)."); return; }
    if (cooldown > 0 || loading) return;
    setErro(""); setMsg(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j?.error || "Não foi possível processar agora. Tente novamente em instantes."); return; }
      if (j.exists) {
        setView("codigo"); setCooldown(45);
        setMsg(`Enviamos um código de 6 dígitos para ${email.trim()}. Ele expira em 5 minutos — confira a caixa de entrada e o spam.`);
      } else {
        setErro("Este e-mail não está cadastrado no MAPPER. Verifique se digitou corretamente — ou peça ao administrador para criar o seu acesso.");
      }
    } catch { setErro("Falha ao solicitar o código. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setMsg("");
    if (!/^\d{6,8}$/.test(codigo.trim())) { setErro("O código tem 6 a 8 dígitos (veja o e-mail ou peça um ao administrador)."); return; }
    if (!pwOk) { setErro("A nova senha não atende a todos os requisitos abaixo."); return; }
    if (novaSenha !== confirma) { setErro("A confirmação não corresponde à nova senha."); return; }
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      const { error: e1 } = await sb.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: "recovery" });
      if (e1) { setErro("Código inválido ou expirado. Peça um novo (ou ao administrador) e tente de novo."); setLoading(false); return; }
      const { error: e2 } = await sb.auth.updateUser({ password: novaSenha });
      if (e2) { setErro(/password|senha|weak|short/i.test(e2.message || "") ? "Senha recusada pela política de segurança do servidor." : "Não foi possível definir a nova senha."); setLoading(false); return; }
      await sb.auth.signOut();
      setView("login"); setSenha(""); setCodigo(""); setNovaSenha(""); setConfirma(""); setCooldown(0);
      setMsg("Senha alterada com sucesso! Agora é só entrar com ela.");
    } catch { setErro("Falha ao alterar a senha."); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 text-fg bg-gradient-to-br from-surface2 via-surface2 to-brand/10">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-line rounded-2xl shadow-2xl p-8">
          {/* Cabeçalho */}
          <div className="flex flex-col items-center text-center mb-6">
            <h1 className="font-extrabold text-fg text-3xl tracking-tight">MAPPER</h1>
            <p className="text-sm text-muted mt-1">Inteligência Comercial</p>
          </div>

          {erro && <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">{erro}</div>}
          {msg && <div className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">{msg}</div>}

          {view === "login" ? (
            <>
              <form onSubmit={entrar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">E-mail</label>
                  <Input type="email" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="voce@empresa.com" required />
                  {sug && <button type="button" onClick={() => setEmail(sug)} className="block text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1">Você quis dizer <b>{sug}</b>? (clique para corrigir)</button>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Senha</label>
                  <div className="relative">
                    <Input type={pwType} autoComplete="current-password" value={senha} onChange={(e: any) => setSenha(e.target.value)} className="pr-10" required />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg" aria-label="mostrar senha">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full justify-center" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
              </form>
              <div className="flex items-center justify-end mt-4 text-xs">
                <button onClick={irParaEsqueci} disabled={loading} className="text-brand font-medium hover:underline disabled:opacity-50">Esqueci minha senha</button>
              </div>
            </>
          ) : view === "esqueci" ? (
            <>
              <p className="text-sm text-muted mb-4 text-center">Digite o e-mail da sua conta. Se ele estiver cadastrado, enviamos um código de 6 dígitos para você redefinir a senha (expira em 5 minutos).</p>
              <form onSubmit={(e) => { e.preventDefault(); solicitarReset(); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">E-mail</label>
                  <Input type="email" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="voce@empresa.com" autoFocus required />
                  {sug && <button type="button" onClick={() => setEmail(sug)} className="block text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1">Você quis dizer <b>{sug}</b>? (clique para corrigir)</button>}
                </div>
                <Button type="submit" className="w-full justify-center" disabled={loading || cooldown > 0}>{loading ? "Enviando…" : cooldown > 0 ? `Aguarde ${cooldown}s` : "Enviar código"}</Button>
              </form>
              <div className="flex items-center justify-center mt-4 text-xs">
                <button onClick={() => { setView("login"); setErro(""); setMsg(""); }} className="text-muted hover:text-fg hover:underline inline-flex items-center gap-1"><ArrowLeft size={12} /> Voltar ao login</button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={trocarSenha} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">E-mail</label>
                  <Input type="email" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="voce@empresa.com" required />
                  {sug && <button type="button" onClick={() => setEmail(sug)} className="block text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1">Você quis dizer <b>{sug}</b>?</button>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Código (do e-mail ou do administrador)</label>
                  <Input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={codigo} onChange={(e: any) => setCodigo(e.target.value.replace(/\D/g, ""))} placeholder="ex.: 123456" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Nova senha</label>
                  <div className="relative">
                    <Input type={pwType} autoComplete="new-password" value={novaSenha} onChange={(e: any) => setNovaSenha(e.target.value)} className="pr-10" required />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg" aria-label="mostrar senha">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {novaSenha.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                      {ruleState.map((r) => (
                        <span key={r.key} className={"text-xs inline-flex items-center gap-1 " + (r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted")}>{r.ok ? "✓" : "○"} {r.label}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Confirmar nova senha</label>
                  <Input type={pwType} autoComplete="new-password" value={confirma} onChange={(e: any) => setConfirma(e.target.value)} required />
                  {confirma.length > 0 && confirma !== novaSenha && <p className="text-xs text-red-600 dark:text-red-400 mt-1">As senhas não coincidem.</p>}
                </div>
                <Button type="submit" className="w-full justify-center" disabled={loading || !pwOk || novaSenha !== confirma || codigo.length < 6}>{loading ? "Alterando…" : "Definir nova senha"}</Button>
              </form>
              <div className="flex items-center justify-between mt-4 text-xs">
                <button onClick={() => { setView("login"); setErro(""); setMsg(""); }} className="text-muted hover:text-fg hover:underline inline-flex items-center gap-1"><ArrowLeft size={12} /> Voltar ao login</button>
                <button onClick={solicitarReset} disabled={loading || cooldown > 0} className="text-brand font-medium hover:underline disabled:opacity-40 disabled:text-muted">
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-4">developed by Henri Mafra</p>
      </div>
    </div>
  );
}
