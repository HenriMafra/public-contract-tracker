import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Busca órgãos do PRÓPRIO site (tabela `orgaos`, vinda do PNCP) por NOME, para o typeahead do RO.
// Devolve nome + CNPJ + município/UF dos que têm CNPJ — o RO usa o CNPJ pra cruzar nas 5 fontes.
// RLS-scoped (supabaseServer) → respeita o escopo de UF do usuário. Entrada sanitizada (sem
// caracteres especiais de filtro PostgREST) e ILIKE em duas colunas de nome, mesclando + dedupe.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const raw = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  const safe = raw.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  if (safe.length < 3) return NextResponse.json({ orgaos: [] });

  try {
    const sb = supabaseServer();
    const sel = "cnpj_orgao, nome_orgao, nome_padronizado, municipio, uf";
    const pat = `%${safe}%`;
    const [a, b] = await Promise.all([
      sb.from("orgaos").select(sel).not("cnpj_orgao", "is", null).ilike("nome_padronizado", pat).limit(12),
      sb.from("orgaos").select(sel).not("cnpj_orgao", "is", null).ilike("nome_orgao", pat).limit(12),
    ]);
    const rows = [...(a.data || []), ...(b.data || [])];
    const seen = new Set<string>();
    const orgaos: any[] = [];
    for (const o of rows) {
      const cnpj = String(o.cnpj_orgao || "").replace(/\D/g, "");
      if (cnpj.length !== 14 || seen.has(cnpj)) continue;
      seen.add(cnpj);
      orgaos.push({ nome: o.nome_padronizado || o.nome_orgao, cnpj, municipio: o.municipio, uf: o.uf });
      if (orgaos.length >= 12) break;
    }
    return NextResponse.json({ orgaos });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro na busca." }, { status: 500 });
  }
}
