import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const RT_TABLES = ["atlas_jobs", "atlas_job_logs", "atlas_job_artifacts", "rodadas", "oportunidades",
  "oportunidade_historico", "tarefas", "contatos", "revisoes", "audit_logs"];

export async function GET() {
  const user = await getCurrentUser();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const configured = /^https:\/\//.test(url) && !/placeholder/i.test(url) && !!anon && !/placeholder/i.test(anon);

  let restReachable = false;
  if (configured) {
    try {
      const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/", { headers: { apikey: anon }, signal: AbortSignal.timeout(6000) });
      restReachable = r.ok || r.status === 404;
    } catch { /* */ }
  }
  return NextResponse.json({
    ok: true,
    authenticated: !!user,
    realtimeConfigured: configured,    // só anon/URL públicas — sem service role
    restReachable,
    mode: configured && restReachable ? "realtime" : "polling",
    tables: RT_TABLES,
    note: configured
      ? "Realtime habilitado. Confirme a publication com supabase/realtime_publications.sql."
      : "Sem chaves Supabase reais → o frontend usa POLLING (fallback). Nenhum dado parado sem aviso.",
  });
}
