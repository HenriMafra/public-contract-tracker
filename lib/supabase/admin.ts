// ATENÇÃO: importar SOMENTE em código de servidor (API routes / scripts). Nunca em Client Components.
//
// IMPORTANTE: usamos PostgrestClient (lib interna do supabase-js, "query builder" puro — mesma
// API .from()/.rpc() de sempre) em vez de createClient() do @supabase/supabase-js. Motivo: no
// runtime do Cloudflare Workers, createClient() inicializa também um RealtimeClient e dispara uma
// promise solta (`this.realtime.setAuth(token)`) na construção — isso travava TODA chamada
// (timeout ~20s, erro "522") mesmo quando Realtime nunca era usado. PostgrestClient evita esse
// caminho inteiro e fala direto com a REST API (/rest/v1) — mesmo resultado, sem o travamento.
// (Diagnosticado 2026-06-30: logs do Supabase mostravam 522 em 100% das chamadas REST do Worker,
// enquanto @supabase/ssr — usado no middleware/login — sempre respondia rápido.)
import { PostgrestClient } from "@supabase/postgrest-js";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role";

/** Cliente com SERVICE ROLE — SOMENTE no servidor (API routes / scripts). NUNCA no browser.
 *  Use para .from()/.rpc() (a grande maioria dos casos). Para .auth.admin/.storage, use
 *  supabaseAdminFull() abaixo. */
export function supabaseAdmin() {
  return new PostgrestClient(new globalThis.URL("rest/v1", URL).href, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
    schema: "public",
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  });
}

/** Cliente COMPLETO (auth.admin + storage) — só para as poucas rotas que precisam disso
 *  (gestão de usuários, download de artefatos). Mais pesado: pode sofrer o mesmo travamento
 *  no Workers se a inicialização do Realtime hangar — usar supabaseAdmin() sempre que possível. */
export function supabaseAdminFull() {
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...args: Parameters<typeof fetch>) => fetch(...args) },
  });
}
