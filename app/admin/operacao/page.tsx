import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/permissions";
import { Shell, Forbidden } from "@/components/layout/Shell";
import { PageTitle, Card, CardPad } from "@/components/ui/primitives";
import { JobRunControls } from "@/components/admin/JobRunControls";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Database, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStatus() {
  try {
    const sb = supabaseAdmin();
    const [{ data: rod }, { count: nEditais }, { data: ultEdital }] = await Promise.all([
      sb.from("rodadas").select("data_rodada,total_oportunidades,total_ti,valor_total_mapeado,status_execucao").order("data_rodada", { ascending: false }).order("id", { ascending: false }).limit(1),
      sb.from("editais").select("id", { count: "exact", head: true }),
      sb.from("editais").select("criado_em").order("criado_em", { ascending: false }).limit(1),
    ]);
    return { rodada: rod?.[0] || null, nEditais: nEditais || 0, ultEdital: ultEdital?.[0]?.criado_em || null };
  } catch { return { rodada: null, nEditais: 0, ultEdital: null }; }
}

const fmt = (d: any) => { try { return d ? new Date(d).toLocaleDateString("pt-BR") : "—"; } catch { return "—"; } };

export default async function OperacaoPage() {
  const user = await requireUser();
  if (!can(user.role, "run_test")) return <Shell user={user}><Forbidden /></Shell>;
  const dbConfigured = !!process.env.DATABASE_URL && !/placeholder|sua_senha/i.test(process.env.DATABASE_URL || "");
  const s = await getStatus();

  return (
    <Shell user={user}>
      <PageTitle title="Operação — dados do site" subtitle="Como as informações são atualizadas e qual o estado atual da base." />

      {/* STATUS REAL DA BASE */}
      <Card className="mb-4"><CardPad>
        <div className="flex items-center gap-2 mb-3"><Database size={16} className="text-brand" /><span className="font-bold text-fg">Estado atual dos dados</span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            ["Última rodada", fmt(s.rodada?.data_rodada)],
            ["Oportunidades na rodada", (s.rodada?.total_oportunidades ?? "—").toLocaleString?.("pt-BR") ?? s.rodada?.total_oportunidades ?? "—"],
            ["Editais/licitações", s.nEditais.toLocaleString("pt-BR")],
            ["Último edital coletado", fmt(s.ultEdital)],
          ].map(([k, v]: any) => (
            <div key={k} className="rounded-xl border border-line bg-surface2/40 px-3 py-2.5">
              <div className="text-xs uppercase tracking-wide text-muted font-semibold">{k}</div>
              <div className="text-lg font-extrabold text-fg mt-0.5 whitespace-nowrap truncate">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-2.5"><CheckCircle2 size={13} /> A base está sendo alimentada normalmente pela coleta automática.</div>
      </CardPad></Card>

      {/* COMO FUNCIONA — honesto */}
      <Card className="mb-4"><CardPad>
        <div className="flex items-start gap-2 text-sm">
          <Info size={16} className="text-brand shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-muted leading-relaxed flex-1">
            <p><b className="text-fg">A coleta roda 24/7 em 2 máquinas na nuvem (Oracle Cloud, gratuito) — sem depender de nenhum PC.</b> O site é a vitrine (lê o banco); a coleta acontece nas máquinas de dados e grava no banco sozinha.</p>
            <p><b className="text-fg">Automático:</b> editais novos <b>todos os dias</b> e a base é atualizada <b>toda semana</b> no modo <b>incremental</b> (puxa só o que é novo/mudou). Você não precisa fazer nada — os números acima se atualizam sozinhos.</p>
            <p>Para <b>forçar uma atualização na hora</b> — <b>incremental</b> (rápido, só o novo) ou <b>completa</b> (refaz os 6 anos, lento) — use os botões abaixo. O pedido é executado pelas <b>máquinas de dados</b>.</p>
            <p className="text-xs mt-1">Obs.: se as máquinas estiverem ocupadas (ex.: numa recoleta completa em andamento), o pedido fica <b>na fila</b> até elas liberarem.</p>
          </div>
        </div>
      </CardPad></Card>

      <details className="mt-2">
        <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line bg-surface text-sm font-semibold text-muted hover:text-fg">⚙️ Forçar atualização manual (avançado)</summary>
        <div className="mt-3">
          <JobRunControls
            canTest={can(user.role, "run_test")}
            canProd={can(user.role, "run_prod")}
            canProdDb={can(user.role, "run_prod_db")}
            canLoadDb={can(user.role, "load_db")}
            dbConfigured={dbConfigured}
          />
          <p className="text-sm text-muted mt-4">
            Pedidos criados aparecem em{" "}
            <Link href="/admin/jobs" className="text-brand font-semibold hover:underline">Admin → Jobs</Link>{" "}
            (lá você vê se o coletor pegou o pedido ou se está aguardando).
          </p>
        </div>
      </details>
    </Shell>
  );
}
