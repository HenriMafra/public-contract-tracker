import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/** Cliente Supabase para Server Components / Route Handlers (respeita RLS via sessão). */
export function supabaseServer() {
  const store = cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* chamado de Server Component (sem escrita de cookie) — ignorado */
        }
      },
    },
  });
}
