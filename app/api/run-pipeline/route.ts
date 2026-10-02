import { NextResponse } from "next/server";
import { requireApi } from "@/lib/api/guard";
import { audit } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEF_CONFIG = process.env.ATLAS_DEFAULT_CONFIG || "config/atlas_config_producao.json";
const DEF_TAG = process.env.ATLAS_DEFAULT_TAG || "PRODUCAO";

// Em vez de rodar o pipeline localmente (child_process não existe em serverless/Cloudflare),
// ENFILEIRA um job em atlas_jobs. O worker Python always-on (host separado) processa.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action: string = body.action || "run";
  const mode: string = body.mode || "teste";
  const writeDb: boolean = !!body.writeDb;

  const perm = action === "load_db" ? "load_db"
    : action === "update_prototype" ? "update_prototype"
    : mode === "producao" && writeDb ? "run_prod_db"
    : mode === "producao" ? "run_prod"
    : "run_test";
  const { user, error } = await requireApi(perm);
  if (error) { if (user) await audit({ usuario: user.nome || user.email, perfil: user.role, acao: perm, resultado: "NEGADO" }); return error; }

  if ((perm === "run_prod" || perm === "run_prod_db") && body.confirm !== true)
    return NextResponse.json({ error: "Confirmação obrigatória para ação crítica." }, { status: 400 });

  const jobType = action === "load_db" ? "load_round_to_db"
    : action === "update_prototype" ? "update_prototype"
    : mode === "producao" && writeDb ? "run_production_write_db"
    : mode === "producao" ? "run_production"
    : "run_test";

  try {
    const { data, error: e } = await supabaseAdmin().from("atlas_jobs").insert({
      job_type: jobType, status: "queued",
      requested_by: user!.nome || user!.email, requested_by_email: user!.email, requested_by_role: user!.role,
      mode, tag: DEF_TAG, write_db: writeDb, config_path: DEF_CONFIG,
      parameters_json: { action, mode, writeDb, config: DEF_CONFIG, tag: DEF_TAG },
    }).select("id").single();
    if (e) throw e;
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: perm, resultado: "OK", detalhes: `job ${jobType} #${data?.id} enfileirado` });
    return NextResponse.json({ ok: true, jobId: data?.id, message: `Job "${jobType}" enfileirado (#${data?.id}). Acompanhe em Admin → Jobs — o worker irá processar.` });
  } catch (e: any) {
    await audit({ usuario: user!.nome || user!.email, perfil: user!.role, acao: perm, resultado: "ERRO", erro: e?.message });
    return NextResponse.json({ ok: false, error: "Não foi possível enfileirar o job. Verifique a conexão com o Supabase." }, { status: 500 });
  }
}
