import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdminFull as supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

const PERFIL_BUCKETS: Record<string, string[]> = {
  "Administrador": ["rodadas", "relatorios", "exports", "logs", "prototipos"],
  "Operador de Inteligência": ["rodadas", "relatorios", "exports", "logs", "prototipos"],
  "Coordenador Comercial": ["relatorios", "exports", "prototipos"],
  "Diretoria": ["relatorios", "prototipos"],
  "Vendedor": [],
};

export async function GET(req: Request) {
  const { user, error } = await requireApi("open_files");
  if (error) return error;
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") || "";
  const path = url.searchParams.get("path") || "";
  if (path.includes("..") || path.startsWith("/")) return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  const permitidos = PERFIL_BUCKETS[user!.role] || [];
  if (!permitidos.includes(bucket)) return NextResponse.json({ error: "Seu perfil não tem acesso a este bucket." }, { status: 403 });
  const sb = supabaseAdmin();
  if (path) {
    const { data, error: e } = await sb.storage.from(bucket).createSignedUrl(path, 60);
    if (e || !data) return NextResponse.json({ error: e?.message || "Arquivo não encontrado." }, { status: 404 });
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "open_files", detalhes: `${bucket}/${path}` });
    return NextResponse.redirect(data.signedUrl);
  }
  const prefix = url.searchParams.get("prefix") || "";
  if (prefix.includes("..") || prefix.startsWith("/")) return NextResponse.json({ error: "Prefixo inválido." }, { status: 400 });
  const { data, error: e } = await sb.storage.from(bucket).list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (e) return NextResponse.json({ error: e.message, bucket }, { status: 500 });
  const itens = (data || []).map((f: any) => ({
    name: f.name, folder: !f.id, size: f.metadata?.size ?? null,
    path: prefix ? `${prefix}/${f.name}` : f.name,
  }));
  return NextResponse.json({ ok: true, bucket, prefix, itens });
}
