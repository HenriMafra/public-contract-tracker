import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const sb = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  let user = null;
  try { user = (await sb.auth.getUser()).data.user; } catch { /* sem conexão Supabase */ }

  const path = req.nextUrl.pathname;
  const publico = path === "/" || path === "/login" || path === "/definir-senha" || path.startsWith("/api/") || path.startsWith("/_next") || path === "/favicon.ico" || path === "/icon.svg" || path === "/apple-icon.png";
  if (!user && !publico) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  // MFA removido a pedido (2026-07-01): login é só e-mail + senha, sem 2º fator.
  // Reverter: `git log` neste arquivo e restaurar o bloco de verificação de aal2.
  if (user && path === "/mfa") {
    const url = req.nextUrl.clone(); url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = req.nextUrl.clone(); url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  // Nunca cachear o HTML das páginas: o navegador sempre busca a versão nova
  // (os arquivos estáticos JS/CSS têm hash no nome e seguem em cache eterno).
  // Sem isto, quem já abriu o site fica preso numa versão antiga até limpar o cache.
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  // Cabeçalhos de segurança (hardening).
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // CSP: 'self' + Supabase (auth/REST/Realtime por wss). 'unsafe-inline'/'unsafe-eval' são exigidos
  // pelo runtime do Next 14 (hidratação sem nonce). O app não carrega script/img/fetch de terceiros
  // (CNPJ e PNCP são server-side), por isso nenhuma origem externa. frame-ancestors trava clickjacking.
  res.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};
