import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

// Contratos de um fornecedor, agrupados por órgão. RLS aplica o escopo do usuário
// (quem tem localização definida só vê os contratos dos órgãos daquelas UFs).
// IMPORTANTE: o mesmo fornecedor costuma aparecer com CNPJs diferentes (matriz/filial,
// truncados). Agrupamos pela RAIZ do CNPJ (8 primeiros dígitos) para unir tudo —
// ex.: SERPRO aparece em 3 cadastros e antes mostrava "sem contratos".
export async function GET(req: Request) {
  const { error } = await requireApi("view_commercial");
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const idParam = sp.get("id");
  const cnpjParam = sp.get("cnpj");
  const sb = supabaseServer();

  // 1) descobre o CNPJ de referência (do parâmetro, ou via id)
  let cnpjRef = cnpjParam || "";
  if (!cnpjRef && idParam) {
    const { data } = await sb.from("fornecedores").select("cnpj_fornecedor").eq("id", idParam).maybeSingle();
    cnpjRef = (data as any)?.cnpj_fornecedor || "";
  }
  const digits = String(cnpjRef).replace(/\D/g, "");
  const raiz = digits.slice(0, 8);

  // 2) acha TODOS os cadastros do fornecedor (mesma raiz de CNPJ)
  let ids: any[] = [];
  let nomeCanonico = "";
  if (raiz.length >= 6) {
    const { data: forns } = await sb.from("fornecedores")
      .select("id,cnpj_fornecedor,nome_fornecedor").ilike("cnpj_fornecedor", `${raiz}%`).limit(50);
    for (const f of (forns || []) as any[]) {
      ids.push(f.id);
      if ((f.nome_fornecedor || "").length > nomeCanonico.length) nomeCanonico = f.nome_fornecedor;
    }
  }
  // fallback: id direto se não achou por raiz
  if (!ids.length && idParam) ids = [idParam];
  if (!ids.length) return NextResponse.json({ ok: true, orgaos: [], total: 0, fornecedor: nomeCanonico || null, cadastros: 0 });

  // 3) contratos de todos esses cadastros (RLS aplica o escopo do usuário)
  const { data, error: e } = await sb.from("contratos")
    .select("id,numero_contrato,valor_total,dias_ate_vencimento,fim_vigencia,objeto_original,categoria_principal,fabricante,link_fonte,orgao_id,orgaos(nome_padronizado,nome_orgao,uf)")
    .in("fornecedor_id", ids)
    .order("dias_ate_vencimento", { ascending: true })
    .limit(2000);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });

  const grupos: Record<string, any> = {};
  for (const c of (data || []) as any[]) {
    const org = Array.isArray(c.orgaos) ? c.orgaos[0] : c.orgaos;
    const nome = org?.nome_padronizado || org?.nome_orgao || "—";
    (grupos[nome] ||= { orgao_id: c.orgao_id, orgao: nome, uf: org?.uf || "", contratos: [] }).contratos.push({
      id: c.id, numero: c.numero_contrato, valor: c.valor_total, dias: c.dias_ate_vencimento,
      fim: c.fim_vigencia, objeto: c.objeto_original, categoria: c.categoria_principal, fabricante: c.fabricante || null, link: c.link_fonte,
    });
  }
  const orgaos = Object.values(grupos).sort((a: any, b: any) => b.contratos.length - a.contratos.length);
  return NextResponse.json({ ok: true, orgaos, total: (data || []).length, fornecedor: nomeCanonico || null, cadastros: ids.length });
}
