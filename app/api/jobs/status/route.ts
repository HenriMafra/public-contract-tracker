import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const FINISHED = ["success", "failed", "cancelled", "timeout"];

export async function GET(req: Request) {
  const { user, error } = await requireApi("view_rodadas");
  if (error) return error;
  const url = new URL(req.url);
  const id = url.searchParams.get("job_id");
  const sb = supabaseAdmin();
  if (!id) {
    // lista recente + KPIs (para o painel /admin/jobs)
    const [{ data: jobs }, { data: dash }] = await Promise.all([
      sb.from("vw_jobs_recentes").select("*").limit(50),
      sb.from("vw_job_dashboard").select("*").single(),
    ]);
    let list = jobs || [];
    if (["Coordenador Comercial", "Diretoria"].includes(user!.role))
      list = list.filter((j: any) => FINISHED.includes(j.status));
    return NextResponse.json({ ok: true, jobs: list, dashboard: dash || {} });
  }
  const { data: job } = await sb.from("atlas_jobs").select("*").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "job não encontrado" }, { status: 404 });
  if (["Coordenador Comercial", "Diretoria"].includes(user!.role) && !FINISHED.includes(job.status))
    return NextResponse.json({ error: "Job em andamento — visível após concluído." }, { status: 403 });
  const { data: arts } = await sb.from("atlas_job_artifacts").select("*").eq("job_id", id).order("id");
  return NextResponse.json({ ok: true, job, artifacts: arts || [] });
}
