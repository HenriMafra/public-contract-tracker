import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Role } from "@/lib/permissions";

export interface AppUser {
  id: string; email: string; role: Role; nome?: string; uf?: string; vendedor?: string;
}

/** Lê a sessão Supabase + o perfil (tabela `perfis`). Retorna null se não autenticado.
 *  Memoizado por requisição (React cache) — chamado pela página, pelo Shell e pelo "ver como"
 *  sem repetir a validação no Supabase. */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<AppUser | null> {
  const sb = supabaseServer();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  let role: Role = "Intern", nome, uf, vendedor;
  try {
    const { data: perfil } = await sb.from("perfis")
      .select("role,nome,uf,vendedor_nome,ativo").eq("user_id", user.id).single();
    if (perfil) {
      if (perfil.ativo === false) return null; // usuário desativado não acessa
      role = (perfil.role as Role) || role; nome = perfil.nome; uf = perfil.uf; vendedor = perfil.vendedor_nome;
    }
  } catch { /* sem perfil ainda */ }
  // fallback: role em user_metadata
  if (!nome && (user.user_metadata as any)?.role) role = (user.user_metadata as any).role;
  return { id: user.id, email: user.email || "", role, nome, uf, vendedor };
});

/** Garante usuário autenticado (senão redireciona ao login). */
export async function requireUser(): Promise<AppUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

/** Identidade usada em responsavel_atribuido (assumir) e no filtro de "Meus Contratos". */
export function nomeResponsavel(u: AppUser | null | undefined): string {
  return (u?.nome || u?.vendedor || u?.email || "").trim();
}
