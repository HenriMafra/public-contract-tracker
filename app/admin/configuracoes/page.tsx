import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { ConfigEditor } from "@/components/ConfigEditor";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  if (!can(user.role, "edit_config_comercial")) return <Shell user={user}><Forbidden /></Shell>;
  let params: any[] = [];
  try {
    const sb = supabaseServer();
    const { data } = await sb.from("parametros_sistema").select("chave,valor_json,descricao").order("chave");
    params = data || [];
  } catch { /* sem banco */ }
  return (
    <Shell user={user}>
      <PageTitle title="Configurações" subtitle="Parâmetros do sistema (categorias, pesos do score, concorrentes…). Toda alteração gera backup + auditoria." />
      <ConfigEditor params={params} />
      <p className="text-xs text-muted mt-3">Observação: a chave <code>categorias_ti</code> mostra a <b>taxonomia real</b> (216 termos, 13 categorias) que o classificador usa. Mudar termos da taxonomia é feito no <b>pipeline (código versionado)</b> — aqui é visualização. Alterar concorrentes/score impacta a priorização — valide com a equipe comercial.</p>
    </Shell>
  );
}
