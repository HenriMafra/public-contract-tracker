import { supabaseAdmin } from "@/lib/supabase/admin";

export async function audit(opts: {
  usuario?: string; perfil?: string; acao: string; detalhes?: string;
  parametros?: any; resultado?: string; erro?: string; duracao?: number; local?: string;
  oportunidade_id?: number | null;
}) {
  try {
    const sb = supabaseAdmin();
    const row: any = {
      usuario: opts.usuario || "", perfil: opts.perfil || "", acao: opts.acao,
      detalhes: (opts.detalhes || "").slice(0, 2000),
      parametros: opts.parametros ? JSON.stringify(opts.parametros).slice(0, 1000) : null,
      resultado: opts.resultado || "OK", erro: (opts.erro || "").slice(0, 2000),
      duracao: opts.duracao ?? null, local: opts.local || "atlas-online",
    };
    if (opts.oportunidade_id != null) row.oportunidade_id = opts.oportunidade_id;
    await sb.from("audit_logs").insert(row);
  } catch {
    /* auditoria nunca deve quebrar a operação */
  }
}
