import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireApi("view_audit");
  if (error) return error;
  const url = new URL(req.url);
  const usuario = url.searchParams.get("usuario");
  const acao = url.searchParams.get("acao");
  const resultado = url.searchParams.get("resultado");
  let qb = supabaseAdmin().from("audit_logs").select("*").order("id", { ascending: false }).limit(400);
  if (usuario) qb = qb.eq("usuario", usuario);
  if (acao) qb = qb.eq("acao", acao);
  if (resultado) qb = qb.eq("resultado", resultado);
  const { data, error: e } = await qb;
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true, logs: data || [] });
}
