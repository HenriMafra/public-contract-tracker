import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = body.jobId || body.job_id;
  const { user, error } = await requireApi("run_test"); // Admin/Operador
  if (error) { if (user) await audit({ usuario: user.nome || user.email, perfil: user.role, acao: "job:cancel", resultado: "NEGADO" }); return error; }
  if (!id) return NextResponse.json({ error: "jobId obrigatório" }, { status: 400 });
  const sb = supabaseAdmin();
  const { data: job } = await sb.from("atlas_jobs").select("status").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "job não encontrado" }, { status: 404 });
  if (["success", "failed", "cancelled", "timeout"].includes(job.status))
    return NextResponse.json({ error: "Job já finalizado." }, { status: 400 });
  const { error: e2 } = await sb.from("atlas_jobs").update({ cancel_requested: true, updated_at: new Date().toISOString() }).eq("id", id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "job:cancel", detalhes: "job_id=" + id, resultado: "OK" });
  return NextResponse.json({ ok: true, message: "Cancelamento solicitado. O worker interromperá com segurança." });
}
