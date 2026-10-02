import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// jobType -> { permissão exigida, é crítico?, defaults }
const MAP: Record<string, { perm: string; critical: boolean; mode?: string; writeDb?: boolean }> = {
  run_test:                { perm: "run_test", critical: false, mode: "teste" },
  run_production:          { perm: "run_prod", critical: true, mode: "producao" },
  run_production_write_db: { perm: "run_prod_db", critical: true, mode: "producao", writeDb: true },
  load_round_to_db:        { perm: "load_db", critical: false },
  generate_package:        { perm: "gen_package", critical: false },
  update_prototype:        { perm: "update_prototype", critical: false },
  validate_online:         { perm: "run_test", critical: false },
  auto_setup:              { perm: "auto_setup", critical: true },
  apply_sql:               { perm: "auto_setup", critical: true },
  create_users:            { perm: "manage_users", critical: true },
  upload_artifacts:        { perm: "run_test", critical: false },
  reupload_artifact:       { perm: "run_test", critical: false },
  sync_storage:            { perm: "run_test", critical: false },
  cleanup_old_signed_urls: { perm: "auto_setup", critical: false },
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jobType: string = body.jobType || "";
  const m = MAP[jobType];
  if (!m) return NextResponse.json({ error: "jobType inválido." }, { status: 400 });

  const { user, error } = await requireApi(m.perm);
  if (error) { if (user) await audit({ usuario: user.nome || user.email, perfil: user.role, acao: "job:create:" + jobType, resultado: "NEGADO" }); return error; }
  if (m.critical && body.confirm !== true)
    return NextResponse.json({ error: "Confirmação obrigatória para job crítico." }, { status: 400 });

  const row = {
    job_type: jobType, status: "queued",
    requested_by: user!.nome || user!.email, requested_by_email: user!.email, requested_by_role: user!.role,
    mode: body.mode || m.mode || null,
    tag: body.tag || (m.mode === "producao" ? "PRODUCAO" : null),
    write_db: !!(body.writeDb ?? m.writeDb),
    config_path: body.configPath || null,
    parameters_json: body.parameters || {},
    priority: typeof body.priority === "number" ? body.priority : (m.critical ? 8 : 5),
    max_retries: typeof body.maxRetries === "number" ? body.maxRetries : 0,
  };
  const sb = supabaseAdmin();
  const { data, error: e2 } = await sb.from("atlas_jobs").insert(row).select("id").single();
  if (e2) return NextResponse.json({ error: "Falha ao criar job: " + e2.message }, { status: 500 });
  await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "job:create:" + jobType, detalhes: "job_id=" + data!.id, resultado: "OK" });
  return NextResponse.json({ ok: true, jobId: data!.id });
}
