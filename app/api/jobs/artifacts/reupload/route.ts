import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Reenvia um artefato ao Storage criando um job reupload_artifact (o worker executa,
// pois o arquivo local está no host do worker — não no servidor web).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const artifactId = body.artifactId || body.artifact_id;
  const { user, error } = await requireApi("run_test"); // Admin/Operador
  if (error) { if (user) await audit({ usuario: user.nome || user.email, perfil: user.role, acao: "artifact:reupload", resultado: "NEGADO" }); return error; }
  if (!artifactId) return NextResponse.json({ error: "artifactId obrigatório" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: art } = await sb.from("atlas_job_artifacts").select("id, job_id, local_path, file_name").eq("id", artifactId).single();
  if (!art) return NextResponse.json({ error: "artefato não encontrado" }, { status: 404 });
  if (!art.local_path) return NextResponse.json({ error: "sem local_path para reenviar" }, { status: 400 });

  const { data, error: e2 } = await sb.from("atlas_jobs").insert({
    job_type: "reupload_artifact", status: "queued", priority: 7,
    requested_by: user!.nome || user!.email, requested_by_email: user!.email, requested_by_role: user!.role,
    parameters_json: { artifact_id: artifactId },
  }).select("id").single();
  if (e2) return NextResponse.json({ error: "falha ao enfileirar: " + e2.message }, { status: 500 });
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "artifact:reupload", detalhes: `artifact_id=${artifactId} job=${data!.id}`, resultado: "OK" });
  return NextResponse.json({ ok: true, jobId: data!.id, message: "Reenvio enfileirado. O worker fará o upload." });
}
