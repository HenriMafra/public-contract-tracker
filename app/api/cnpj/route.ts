import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

// Consulta o MESMO CNPJ em 5 fontes públicas em paralelo (no servidor, sem CORS), normaliza para
// um formato comum, e cruza os dados: devolve o valor de CONSENSO por campo + as DIVERGÊNCIAS.
// Tolerante a falhas: cada fonte que cair/limitar é ignorada; usa o que respondeu.

const TIMEOUT = 7000;
async function getJson(url: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
const digits = (s: any) => String(s ?? "").replace(/\D/g, "");
const txt = (s: any) => String(s ?? "").trim();

type Norm = { fonte: string; ok: boolean; razao_social: string; nome_fantasia: string; logradouro: string; numero: string; bairro: string; municipio: string; uf: string; cep: string; telefone: string; email: string; situacao: string };
const empty = (fonte: string): Norm => ({ fonte, ok: false, razao_social: "", nome_fantasia: "", logradouro: "", numero: "", bairro: "", municipio: "", uf: "", cep: "", telefone: "", email: "", situacao: "" });

async function brasilapi(cnpj: string): Promise<Norm> {
  const j = await getJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (!j || !(j.razao_social || j.nome_fantasia)) return empty("BrasilAPI");
  return { fonte: "BrasilAPI", ok: true, razao_social: txt(j.razao_social), nome_fantasia: txt(j.nome_fantasia), logradouro: txt([j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(" ")), numero: txt(j.numero), bairro: txt(j.bairro), municipio: txt(j.municipio), uf: txt(j.uf), cep: digits(j.cep), telefone: digits(j.ddd_telefone_1), email: txt(j.email), situacao: txt(j.descricao_situacao_cadastral) };
}
async function receitaws(cnpj: string): Promise<Norm> {
  const j = await getJson(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  if (!j || j.status === "ERROR" || !j.nome) return empty("ReceitaWS");
  return { fonte: "ReceitaWS", ok: true, razao_social: txt(j.nome), nome_fantasia: txt(j.fantasia), logradouro: txt(j.logradouro), numero: txt(j.numero), bairro: txt(j.bairro), municipio: txt(j.municipio), uf: txt(j.uf), cep: digits(j.cep), telefone: digits(j.telefone), email: txt(j.email), situacao: txt(j.situacao) };
}
async function cnpjws(cnpj: string): Promise<Norm> {
  const j = await getJson(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  const est = j?.estabelecimento;
  if (!j || !est) return empty("CNPJ.ws");
  return { fonte: "CNPJ.ws", ok: true, razao_social: txt(j.razao_social), nome_fantasia: txt(est.nome_fantasia), logradouro: txt([est.tipo_logradouro, est.logradouro].filter(Boolean).join(" ")), numero: txt(est.numero), bairro: txt(est.bairro), municipio: txt(est.cidade?.nome), uf: txt(est.estado?.sigla), cep: digits(est.cep), telefone: digits([est.ddd1, est.telefone1].filter(Boolean).join("")), email: txt(est.email), situacao: txt(est.situacao_cadastral) };
}
async function minhareceita(cnpj: string): Promise<Norm> {
  const j = await getJson(`https://minhareceita.org/${cnpj}`);
  if (!j || !j.razao_social) return empty("Minha Receita");
  return { fonte: "Minha Receita", ok: true, razao_social: txt(j.razao_social), nome_fantasia: txt(j.nome_fantasia), logradouro: txt([j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(" ")), numero: txt(j.numero), bairro: txt(j.bairro), municipio: txt(j.municipio), uf: txt(j.uf), cep: digits(j.cep), telefone: digits(j.ddd_telefone_1), email: txt(j.email), situacao: txt(j.descricao_situacao_cadastral) };
}
async function cnpja(cnpj: string): Promise<Norm> {
  const j = await getJson(`https://open.cnpja.com/office/${cnpj}`);
  if (!j || !j.company?.name) return empty("CNPJá");
  const ph = (j.phones || [])[0];
  return { fonte: "CNPJá", ok: true, razao_social: txt(j.company?.name), nome_fantasia: txt(j.alias), logradouro: txt(j.address?.street), numero: txt(j.address?.number), bairro: txt(j.address?.district), municipio: txt(j.address?.city), uf: txt(j.address?.state), cep: digits(j.address?.zip), telefone: digits(ph ? `${ph.area || ""}${ph.number || ""}` : ""), email: txt((j.emails || [])[0]?.address), situacao: txt(j.status?.text) };
}

const FIELDS: (keyof Norm)[] = ["razao_social", "nome_fantasia", "logradouro", "numero", "bairro", "municipio", "uf", "cep", "telefone", "email", "situacao"];
function chave(field: string, v: string): string {
  if (!v) return "";
  if (field === "cep" || field === "telefone") return digits(v);
  if (field === "uf") return v.toUpperCase().trim();
  return v.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function consensoCampo(field: keyof Norm, norms: Norm[]) {
  const vals = norms.filter((n) => n.ok && txt(n[field] as any)).map((n) => ({ fonte: n.fonte, valor: String(n[field]) }));
  const groups: Record<string, { valor: string; fontes: string[] }> = {};
  for (const { fonte, valor } of vals) {
    const k = chave(field, valor);
    if (!k) continue;
    if (!groups[k]) groups[k] = { valor, fontes: [] };
    groups[k].fontes.push(fonte);
  }
  const arr = Object.values(groups).sort((a, b) => b.fontes.length - a.fontes.length);
  return { valor: arr[0]?.valor || "", divergente: arr.length > 1, opcoes: arr.map((g) => ({ valor: g.valor, fontes: g.fontes })) };
}

export async function GET(req: Request) {
  // Aberto também ao registro público de oportunidade (site aberto): consulta apenas fontes
  // públicas de CNPJ, sem tocar em dados internos — por isso não exige login.
  const cnpj = digits(new URL(req.url).searchParams.get("cnpj") || "");
  if (cnpj.length !== 14) return NextResponse.json({ error: "CNPJ inválido (14 dígitos)." }, { status: 400 });

  const norms = await Promise.all([brasilapi(cnpj), receitaws(cnpj), cnpjws(cnpj), minhareceita(cnpj), cnpja(cnpj)]);
  const okCount = norms.filter((n) => n.ok).length;
  const consenso: Record<string, string> = {};
  const divergencias: { campo: string; opcoes: { valor: string; fontes: string[] }[] }[] = [];
  for (const f of FIELDS) {
    const c = consensoCampo(f, norms);
    consenso[f] = c.valor;
    if (c.divergente) divergencias.push({ campo: f, opcoes: c.opcoes });
  }
  return NextResponse.json({
    cnpj, encontrado: okCount > 0,
    fontes: norms.map((n) => ({ fonte: n.fonte, ok: n.ok })),
    consenso, divergencias,
  });
}
