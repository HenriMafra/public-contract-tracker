import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle } from "@/components/ui/primitives";
import { ListaAtaqueView, FETCH_COLS } from "@/components/lista/ListaAtaqueView";
import { getOportunidadesTotal } from "@/lib/queries/views";
import { escopoVerComo } from "@/lib/auth/verComo";
import { LiveListaAtaque } from "@/components/realtime/LiveListaAtaque";
import { Expandable } from "@/components/ui/Expandable";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const SCOPED = ["Account Manager"]; // só AM é filtrado por UF; resto vê tudo

export default async function ListaAtaquePage({ searchParams }: { searchParams: Record<string, string> }) {
  const user = await requireUser();
  if (!can(user.role, "view_commercial")) return <Shell user={user}><Forbidden /></Shell>;
  const vc = await escopoVerComo();
  const total = await getOportunidadesTotal(searchParams);
  const vcUfs = vc && !vc.veTudo ? (vc.ufs || []) : null;

  // "Ver como" (preview do admin): busca as linhas escopadas NO SERVIDOR (service-role, rápido,
  // sem o custo de RLS por linha) e entrega prontas — garante que o preview nunca venha vazio.
  let initialRows: any[] | null = null;
  if (vc && vcUfs && vcUfs.length) {
    try {
      const { data } = await supabaseAdmin().from("vw_lista_ataque_atual").select(FETCH_COLS)
        .in("uf", vcUfs).order("id", { ascending: true }).limit(40000);
      initialRows = data || [];
    } catch { initialRows = null; }
  }

  // Foco "Meus órgãos" (orgao_padronizado) — só do próprio usuário escopado, fora do "ver como".
  let focoOrgaos: string[] | null = null;
  if (!vc && SCOPED.includes(user.role)) {
    try {
      const sb = supabaseServer();
      const { data } = await sb.from("perfis").select("orgaos_foco").eq("user_id", user.id).single();
      if (Array.isArray(data?.orgaos_foco) && data!.orgaos_foco.length) focoOrgaos = data!.orgaos_foco as string[];
    } catch { /* ignore */ }
  }

  return (
    <Shell user={user}>
      <LiveListaAtaque>
        <PageTitle title="Lista de Ataque" subtitle="Clique numa linha para abrir a oportunidade · filtre por órgão, solução, UF e urgência · exporte o resultado" />
        <Expandable title="Lista de Ataque">
          <ListaAtaqueView vcUfs={vcUfs} total={total} vencInicial={searchParams.vencendo || ""} canAct={can(user.role, "update_status")} focoOrgaos={focoOrgaos} initialRows={initialRows} />
        </Expandable>
      </LiveListaAtaque>
    </Shell>
  );
}
