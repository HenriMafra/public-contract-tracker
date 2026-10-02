import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { audit } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ação -> { args (script do repo ONLINE, relativo, SEM segredo/--db-url), critical }
// O worker (host) executa `python <args>` no repo online; os scripts leem DATABASE_URL do env do worker.
function plan(action: string, body: any): { args: string[]; critical: boolean } | null {
  const S = (f: string, ...rest: string[]) => ["scripts/" + f, ...rest];
  switch (action) {
    case "doctor": return { args: S("atlas_doctor.py", ...(body.fix ? ["--fix"] : [])), critical: false };
    case "secrets": return { args: S("atlas_secrets_check.py"), critical: false };
    case "validate": return { args: S("atlas_validate_online.py", "--target", "cloud"), critical: false };
    case "test_queue": return { args: S("test_job_queue.py"), critical: false };
    case "test_storage": return { args: S("test_storage_artifacts.py"), critical: false };
    case "test_realtime": return { args: S("test_realtime.py"), critical: false };
    case "test_notifications": return { args: S("test_notifications.py"), critical: false };
    case "test_radar": return { args: S("test_radar.py"), critical: false };
    case "apply_sql": return { args: S("atlas_apply_sql.py"), critical: true };
    case "create_users": return { args: S("atlas_create_users.py", "--from", "config/initial_users.json"), critical: true };
    case "load_data": return { args: S("atlas_load_data.py", "--latest", "--no-init"), critical: true };
    case "schedule": return { args: S("atlas_schedule.py", "--weekly"), critical: true };
    case "create_supabase": return { args: S("atlas_create_supabase_project.py"), critical: true };
    case "setup_full": return { args: S("atlas_auto_setup.py", "--mode", "full"), critical: true };
    case "setup_local": return { args: S("atlas_auto_setup.py", "--mode", "local"), critical: true };
    case "repair": return { args: S("atlas_auto_setup.py", "--mode", "repair"), critical: true };
    default: return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "";
  const { user, error } = await requireApi("auto_setup");
  if (error) { if (user) await audit({ usuario: user.nome || user.email, perfil: user.role, acao: "auto_setup:" + action, resultado: "NEGADO" }); return error; }
  const p = plan(action, body);
  if (!p) return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  if (p.critical && body.confirm !== true)
    return NextResponse.json({ error: "Confirmação obrigatória para esta ação." }, { status: 400 });

  try {
    const { data, error: e } = await supabaseAdmin().from("atlas_jobs").insert({
      job_type: "auto_setup", status: "queued",
      requested_by: user!.nome || user!.email, requested_by_email: user!.email, requested_by_role: user!.role,
      mode: action, parameters_json: { action, args: p.args },
    }).select("id").single();
    if (e) throw e;
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: "auto_setup:" + action, resultado: "OK", detalhes: `job auto_setup #${data?.id} (${action})` });
    return NextResponse.json({ ok: true, jobId: data?.id, action, message: `Automação "${action}" enfileirada (#${data?.id}). O worker (host) vai executar — acompanhe o resultado e os logs em Admin → Jobs.` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, action, error: "Não foi possível enfileirar a automação. Verifique a conexão com o Supabase." }, { status: 500 });
  }
}
