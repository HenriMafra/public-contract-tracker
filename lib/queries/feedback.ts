import { supabaseAdmin } from "@/lib/supabase/admin";

/** Itens de Sugestões/Perguntas/Bugs.
 *  PRIVACIDADE: cada pessoa só vê os PRÓPRIOS itens; o Administrador vê todos.
 *  (Acesso só via service-role; o filtro por autor é aplicado aqui no servidor.) */
export async function getFeedback({ userId, isAdmin }: { userId?: string; isAdmin?: boolean } = {}) {
  try {
    let q = supabaseAdmin().from("feedback").select("*").order("id", { ascending: false }).limit(800);
    if (!isAdmin) q = q.eq("autor_id", userId || "__sem_usuario__");
    const { data } = await q;
    return data || [];
  } catch { return []; }
}
