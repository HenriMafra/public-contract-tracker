import type { SupabaseClient } from "@supabase/supabase-js";

// O GoTrue (Auth) do Supabase no plano Free às vezes responde 500 transitório ao
// criar usuário (especialmente em criações próximas). Este wrapper tenta de novo
// em erros 5xx/429/rede, com pequeno backoff. NÃO insiste em erro definitivo
// (ex.: 422 "e-mail já registrado") — retorna na hora. Mesma assinatura de retorno
// que admin.createUser: { data, error }.
export async function createUserRetry(sb: SupabaseClient, args: any, tries = 4) {
  let last: Awaited<ReturnType<SupabaseClient["auth"]["admin"]["createUser"]>> | null = null;
  for (let i = 0; i < tries; i++) {
    const r = await sb.auth.admin.createUser(args);
    if (!r.error) return r;
    last = r;
    const st = Number((r.error as any)?.status) || 0;
    if (st && st < 500 && st !== 429) break; // erro definitivo → não reenvia
    await new Promise((res) => setTimeout(res, 350 * (i + 1)));
  }
  return last as Awaited<ReturnType<SupabaseClient["auth"]["admin"]["createUser"]>>;
}
