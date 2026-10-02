import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdminFull as supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { canDownloadArtifact } from "@/lib/permissions/artifacts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user, error } = await requireApi("view_rodadas");
  if (error) return error;
  const url = new URL(req.url);
  const artifactId = url.searchParams.get("artifact_id");
  const jobId = url.searchParams.get("job_id");
  const atype = url.searchParams.get("artifact_type");
  const sb = supabaseAdmin();

  let q = sb.from("atlas_job_artifacts").select("*");
  if (artifactId) q = q.eq("id", artifactId);
  else if (jobId && atype) q = q.eq("job_id", jobId).eq("artifact_type", atype);
  else return NextResponse.json({ error: "informe artifact_id ou job_id+artifact_type" }, { status: 400 });
  const { data: art } = await q.limit(1).single();
  if (!art) return NextResponse.json({ error: "artefato não encontrado" }, { status: 404 });

  // RBAC por tipo de artefato
  if (!canDownloadArtifact(user!.role, art.artifact_type)) {
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "artifact:download", detalhes: `id=${art.id} (${art.artifact_type})`, resultado: "NEGADO" });
    return NextResponse.json({ error: "Seu perfil não pode baixar este tipo de artefato." }, { status: 403 });
  }

  // disponível no Storage → signed URL de curta duração
  if (art.storage_bucket && art.storage_path) {
    if (String(art.storage_path).includes("..")) return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
    const { data, error: e2 } = await sb.storage.from(art.storage_bucket).createSignedUrl(art.storage_path, 3600);
    if (e2 || !data?.signedUrl) return NextResponse.json({ error: "falha ao gerar link: " + (e2?.message || "desconhecido") }, { status: 500 });
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "artifact:download", detalhes: `id=${art.id} ${art.artifact_type} ${art.file_name}`, resultado: "OK" });
    return NextResponse.json({ ok: true, url: data.signedUrl, fileName: art.file_name, expiresIn: 3600 });
  }

  // ainda não enviado ao Storage → orienta reupload (não expõe filesystem do worker)
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "artifact:download", detalhes: `id=${art.id} local_only`, resultado: "LOCAL_ONLY" });
  return NextResponse.json({ ok: true, localOnly: true, fileName: art.file_name,
    message: "Artefato ainda não está no Storage (upload_status=" + art.upload_status + "). Use “Reenviar para Storage”." }, { status: 200 });
}
