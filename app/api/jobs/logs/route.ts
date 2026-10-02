import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireApi("view_logs"); // Admin/Operador
  if (error) return error;
  const url = new URL(req.url);
  const id = url.searchParams.get("job_id");
  const after = Number(url.searchParams.get("after") || "0");
  if (!id) return NextResponse.json({ error: "job_id obrigatório" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data, error: e2 } = await sb.from("atlas_job_logs")
    .select("*").eq("job_id", id).gt("id", after).order("id", { ascending: true }).limit(500);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  return NextResponse.json({ ok: true, logs: data || [] });
}
