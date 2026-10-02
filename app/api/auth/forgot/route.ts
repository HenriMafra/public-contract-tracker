import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Fluxo de "esqueci minha senha" do MAPPER.
 *  1) Verifica (via service role) se o e-mail existe — função SECURITY DEFINER,
 *     liberada só ao service_role (sem enumeração pública).
 *  2) Se existir, dispara o e-mail de redefinição (código de 6 dígitos, expira em 5 min).
 *  3) Responde { exists } para a tela mostrar a mensagem certa.
 *  Ferramenta interna (contas criadas pelo admin): revelar existência é intencional. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = String(b?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Configuração do servidor ausente." }, { status: 500 });
  }

  // 1) existe?
  let exists = false;
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.rpc("auth_email_existe", { p_email: email });
    if (error) throw error;
    exists = data === true;
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar agora. Tente novamente em instantes." }, { status: 500 });
  }

  // 2) não existe → avisa (sem enviar nada)
  if (!exists) return NextResponse.json({ ok: true, exists: false });

  // 3) existe → dispara o código (template MAPPER, 5 min). Não falha se cair em rate-limit.
  try {
    await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch { /* o e-mail pode ter sido enviado mesmo assim; segue */ }

  return NextResponse.json({ ok: true, exists: true });
}
