import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canDownloadArtifact } from "@/lib/permissions/artifacts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user, error } = await requireApi("view_rodadas");
  if (error) return error;
  const limit = Number(new URL(req.url).searchParams.get("limit") || "30");
  const sb = supabaseAdmin();
  const { data } = await sb.from("vw_latest_artifacts").select("*").limit(Math.min(limit, 100));
  // só mostra o que o perfil pode baixar
  const visible = (data || []).filter((a: any) => canDownloadArtifact(user!.role, a.artifact_type));
  return NextResponse.json({ ok: true, artifacts: visible });
}
